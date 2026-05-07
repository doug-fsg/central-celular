import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { otpService } from '../services/otpService';

// Normalização conservadora para números BR: garante prefixo 55
function normalizeBrazilPhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  // Se já estiver no formato com DDI (55 + DDD + número), geralmente 12 ou 13 dígitos, mantém
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  // Para entradas de 10 ou 11 dígitos (DDD + número) ou outros casos sem DDI, prefixa 55
  if (digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

type ConvitePrimeiroAcessoKind = 'cadastro' | 'reenvio';

/** Gera token, monta mensagem e envia link /first-access pelo WhatsApp. */
async function enviarConvitePrimeiroAcessoWhatsApp(params: {
  nome: string;
  whatsappNormalizado: string;
  accountId: number;
  kind?: ConvitePrimeiroAcessoKind;
}): Promise<boolean> {
  const kind = params.kind ?? 'cadastro';
  const { code: token } = await otpService.createOtp({
    whatsapp: params.whatsappNormalizado,
    accountId: params.accountId,
    isInvite: true
  });

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://central-celular.vercel.app';
  const inviteLink = `${FRONTEND_URL}/first-access/${token}`;
  const primeiroNome = params.nome.split(' ')[0];

  const mensagem =
    kind === 'reenvio'
      ? `Olá ${primeiroNome}!\n\n` +
        `Segue um *novo link* para criar sua senha no *Aprisco*:\n\n` +
        `${inviteLink}\n\n` +
        `Este link expira em 48 horas.\n\n` +
        `_Se você não esperava esta mensagem, ignore._`
      : `Olá ${primeiroNome}!\n\n` +
        `Você foi cadastrado no sistema *Aprisco*.\n\n` +
        `Para criar sua senha de acesso, clique no link abaixo:\n\n` +
        `${inviteLink}\n\n` +
        `Este link expira em 48 horas.\n\n` +
        `_Se você não solicitou este cadastro, ignore esta mensagem._`;

  return otpService.sendCustomMessageWhatsApp(
    params.whatsappNormalizado,
    mensagem,
    params.accountId
  );
}

// Schema de validação para criar usuário
const criarUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(13, 'WhatsApp deve ter no máximo 13 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  cargo: z.enum(['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'], {
    errorMap: () => ({ message: 'Cargo deve ser ADMINISTRADOR, SUPERVISOR ou LIDER' })
  }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
  enviarConvite: z.boolean().optional()
});

// Schema de validação para atualizar usuário
const atualizarUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(13, 'WhatsApp deve ter no máximo 13 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  cargo: z.enum(['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'], {
    errorMap: () => ({ message: 'Cargo deve ser ADMINISTRADOR, SUPERVISOR ou LIDER' })
  }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional()
});

// Schema para alteração de senha
const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres')
});

// Listar todos os usuários
export const listarUsuarios = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    // Buscar total de registros apenas com filtro de accountId
    const total = await prisma.usuario.count({
      where: {
        accountId: accountId
      }
    });

    // Buscar usuários com paginação e accountId
    const usuarios = await prisma.usuario.findMany({
      where: {
        accountId: accountId
      },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        accountId: true,
        senha: true
      },
      orderBy: [
        { cargo: 'asc' },
        { nome: 'asc' }
      ],
      skip,
      take: limit
    });

    // Ordenar cargos na ordem específica
    const ordemCargos = {
      'ADMINISTRADOR': 1,
      'SUPERVISOR': 2,
      'LIDER': 3,
      'MEMBRO': 4,
      'VISITANTE': 5
    };

    const usuariosOrdenados = usuarios
      .sort((a, b) => {
        const ordemA = ordemCargos[a.cargo as keyof typeof ordemCargos] || 999;
        const ordemB = ordemCargos[b.cargo as keyof typeof ordemCargos] || 999;
        if (ordemA !== ordemB) return ordemA - ordemB;
        return a.nome.localeCompare(b.nome);
      })
      .map(({ senha, ...u }) => ({
        ...u,
        possuiSenha: senha != null && senha.length > 0,
        status: u.ativo ? 'ativo' : 'inativo'
      }));

    res.json({
      usuarios: usuariosOrdenados,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit
      }
    });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro ao listar usuários' });
  }
};

// Obter um usuário específico
export const obterUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro ao obter usuário' });
  }
};

// Criar um novo usuário
export const criarUsuario = async (req: Request, res: Response) => {
  try {
    // Validar dados de entrada
    const dados = criarUsuarioSchema.parse(req.body);
    const whatsappNormalizado = normalizeBrazilPhone(dados.whatsapp);

    // Verificar se já existe usuário com mesmo email ou whatsapp na account
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }



    if (dados.whatsapp) {
      const usuarioExistente = await prisma.usuario.findFirst({
        where: {
          whatsapp: whatsappNormalizado,
          accountId: accountId
        }
      });

      if (usuarioExistente) {
        return res.status(400).json({ message: 'Já existe um usuário com este WhatsApp' });
      }
    }

    const comSenhaInicial = Boolean(dados.senha);

    // Criar usuário: só fica ativo após senha definida (admin na criação ou primeiro acesso)
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        whatsapp: whatsappNormalizado,
        cargo: dados.cargo,
        senha: dados.senha ? await bcrypt.hash(dados.senha, 10) : null,
        accountId: accountId,
        ativo: comSenhaInicial
      }
    });

    /** Quando convite foi solicitado: true = WhatsApp ok, false = falha (usuário ainda criado). */
    let conviteEnviado: boolean | undefined = undefined;

    // Enviar convite via WhatsApp se solicitado
    if (dados.enviarConvite === true && !dados.senha) {
      conviteEnviado = false;
      try {
        console.log('[UsuariosController] Enviando convite via WhatsApp para:', novoUsuario.nome);
        const enviado = await enviarConvitePrimeiroAcessoWhatsApp({
          nome: dados.nome,
          whatsappNormalizado: novoUsuario.whatsapp,
          accountId,
          kind: 'cadastro'
        });
        conviteEnviado = enviado;
        if (enviado) {
          console.log('[UsuariosController] Convite enviado com sucesso via WhatsApp');
        } else {
          console.error('[UsuariosController] Falha ao enviar convite via WhatsApp');
        }
      } catch (error) {
        console.error('[UsuariosController] Erro ao enviar convite:', error);
        conviteEnviado = false;
      }
    }

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    const payload =
      typeof conviteEnviado === 'boolean'
        ? { ...usuarioSemSenha, conviteEnviado }
        : usuarioSemSenha;
    res.status(201).json(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Erro ao processar requisição',
        errors: error.errors 
      });
    }
    
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ message: 'Erro ao criar usuário' });
  }
};

/** Reenvia link de primeiro acesso (sem senha; permanece inativo até concluir o fluxo). */
export const reenviarConviteUsuario = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id, accountId },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        ativo: true,
        senha: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    if (usuario.senha != null && usuario.senha.length > 0) {
      return res.status(400).json({
        message: 'Este usuário já possui senha cadastrada.'
      });
    }

    const conviteEnviado = await enviarConvitePrimeiroAcessoWhatsApp({
      nome: usuario.nome,
      whatsappNormalizado: usuario.whatsapp,
      accountId,
      kind: 'reenvio'
    });

    if (!conviteEnviado) {
      return res.status(502).json({
        message: 'Não foi possível enviar o WhatsApp. Verifique a conexão do bot e tente novamente.',
        conviteEnviado: false
      });
    }

    return res.json({ conviteEnviado: true });
  } catch (error) {
    console.error('[UsuariosController] Erro ao reenviar convite:', error);
    res.status(500).json({ message: 'Erro ao reenviar convite' });
  }
};

// Atualizar um usuário existente
export const atualizarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validar dados de entrada
    const dados = atualizarUsuarioSchema.parse(req.body);
    const whatsappNormalizado = normalizeBrazilPhone(dados.whatsapp);

    // Verificar se usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Dados para atualização
    const dadosAtualizacao: any = {
      nome: dados.nome,
      whatsapp: whatsappNormalizado,
      cargo: dados.cargo
    };

    // Se a senha foi fornecida, hash e atualiza (passa a poder logar como ativo)
    if (dados.senha) {
      const salt = await bcrypt.genSalt(10);
      dadosAtualizacao.senha = await bcrypt.hash(dados.senha, salt);
      dadosAtualizacao.ativo = true;
    }

    // Atualizar usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: dadosAtualizacao
    });

    const { senha: senhaHash, ...usuarioSemSenha } = usuarioAtualizado;
    res.json({
      ...usuarioSemSenha,
      possuiSenha: senhaHash != null && senhaHash.length > 0
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Erro ao processar requisição',
        errors: error.errors 
      });
    }
    
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar usuário' });
  }
};

// Ativar/Desativar um usuário
export const ativarDesativarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ativo } = req.body;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ message: 'O campo ativo deve ser um booleano' });
    }

    // Verificar se usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir desativar o próprio usuário
    if (Number(id) === (req as any).usuario.id) {
      return res.status(400).json({ message: 'Não é possível desativar o próprio usuário' });
    }

    const semSenha =
      usuarioExistente.senha == null || usuarioExistente.senha.length === 0;
    if (ativo && semSenha) {
      return res.status(400).json({
        message:
          'Usuários sem senha só ficam ativos após concluírem o primeiro acesso pelo link do Aprisco.'
      });
    }

    // Verificar se é o último administrador ativo
    if (!ativo && usuarioExistente.cargo === 'ADMINISTRADOR') {
      const adminsAtivos = await prisma.usuario.count({
        where: {
          cargo: 'ADMINISTRADOR',
          ativo: true,
          NOT: {
            id: Number(id)
          }
        }
      });

      if (adminsAtivos === 0) {
        return res.status(400).json({ 
          message: 'Não é possível desativar o último administrador do sistema' 
        });
      }
    }

    // Atualizar status
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: { ativo }
    });

    const { senha: senhaHash, ...usuarioSemSenha } = usuarioAtualizado;
    res.json({
      ...usuarioSemSenha,
      possuiSenha: senhaHash != null && senhaHash.length > 0,
      status: usuarioAtualizado.ativo ? 'ativo' : 'inativo'
    });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
  }
};

const MAX_USUARIOS_LOTE_STATUS = 200;

/** Ativar ou desativar vários usuários da mesma conta (admin). */
export const ativarDesativarUsuariosLote = async (req: Request, res: Response) => {
  try {
    const accountId = (req as any).user?.accountId;
    const actorId = (req as any).user?.id;

    if (!accountId || !actorId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { usuarioIds, ativo } = req.body;
    if (typeof ativo !== 'boolean' || !Array.isArray(usuarioIds) || usuarioIds.length === 0) {
      return res.status(400).json({
        message: 'Informe usuarioIds (array não vazio) e ativo (boolean)',
      });
    }

    const ids = [
      ...new Set(
        usuarioIds
          .map((x: unknown) => Number(x))
          .filter((n: number) => Number.isFinite(n) && n > 0),
      ),
    ];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'Nenhum ID de usuário válido' });
    }

    if (ids.length > MAX_USUARIOS_LOTE_STATUS) {
      return res.status(400).json({
        message: `No máximo ${MAX_USUARIOS_LOTE_STATUS} usuários por lote`,
      });
    }

    const detalhes: { usuarioId: number; ok: boolean; erro?: string }[] = [];

    for (const id of ids) {
      if (!ativo && id === actorId) {
        detalhes.push({
          usuarioId: id,
          ok: false,
          erro: 'Não é possível desativar o próprio usuário',
        });
        continue;
      }

      const usuarioExistente = await prisma.usuario.findFirst({
        where: { id, accountId },
      });

      if (!usuarioExistente) {
        detalhes.push({
          usuarioId: id,
          ok: false,
          erro: 'Usuário não encontrado',
        });
        continue;
      }

      if (!ativo && usuarioExistente.cargo === 'ADMINISTRADOR') {
        const adminsAtivos = await prisma.usuario.count({
          where: {
            cargo: 'ADMINISTRADOR',
            ativo: true,
            NOT: { id },
          },
        });

        if (adminsAtivos === 0) {
          detalhes.push({
            usuarioId: id,
            ok: false,
            erro: 'Não é possível desativar o último administrador ativo',
          });
          continue;
        }
      }

      if (ativo) {
        const semSenha =
          usuarioExistente.senha == null || usuarioExistente.senha.length === 0;
        if (semSenha) {
          detalhes.push({
            usuarioId: id,
            ok: false,
            erro: 'Sem senha: só ativa após o primeiro acesso',
          });
          continue;
        }
      }

      try {
        await prisma.usuario.update({
          where: { id },
          data: { ativo },
        });
        detalhes.push({ usuarioId: id, ok: true });
      } catch (e) {
        detalhes.push({
          usuarioId: id,
          ok: false,
          erro: e instanceof Error ? e.message : 'Erro ao atualizar',
        });
      }
    }

    const alterados = detalhes.filter((d) => d.ok).length;

    return res.json({
      success: detalhes.every((d) => d.ok),
      total: detalhes.length,
      alterados,
      falhas: detalhes.length - alterados,
      detalhes,
    });
  } catch (error) {
    console.error('Erro ao atualizar status em lote:', error);
    res.status(500).json({ message: 'Erro ao atualizar status em lote' });
  }
};

// Alterar senha do usuário
export const alterarSenha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { senhaAtual, novaSenha } = alterarSenhaSchema.parse(req.body);

    // Verificar se usuário existe
    const usuario = await prisma.usuario.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar a senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Senha atual inválida' });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(novaSenha, salt);

    // Atualizar a senha
    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { senha: senhaHash }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ message: 'Erro ao alterar senha' });
  }
};

// Listar celulares associados a um usuário
export const listarCelularesUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar se usuário existe
    const usuario = await prisma.usuario.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Buscar celulas onde o usuário é líder ou colíder
    const celulas = await prisma.celula.findMany({
      where: {
        OR: [
          { liderId: Number(id) },
          { coLiderId: Number(id) }
        ]
      },
      include: {
        lider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        coLider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        regiao: true
      }
    });

    res.json(celulas);
  } catch (error) {
    console.error('Erro ao listar celulares do usuário:', error);
    res.status(500).json({ message: 'Erro ao listar celulares do usuário' });
  }
}; 