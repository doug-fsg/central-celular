import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { otpService } from '../services/otpService';
import { CARGO, isPlatformOwner } from '../lib/roles';
import { getAccountId, getUserId, assertUsuarioBelongsToAccount } from '../lib/tenant';

const AVATAR_DIR = path.resolve(process.cwd(), 'server', 'uploads', 'avatars');
const AVATAR_PUBLIC_PREFIX = '/uploads/avatars';
const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
const AVATAR_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const uploadAvatarSchema = z.object({
  imageData: z.string().min(1),
  mimeType: z.string().min(1).optional(),
});

async function ensureAvatarDir(): Promise<void> {
  await fs.mkdir(AVATAR_DIR, { recursive: true });
}

function parseImagePayload(input: {
  imageData: string;
  mimeType?: string;
}): { buffer: Buffer; ext: string } | { error: string } {
  let raw = input.imageData.trim();
  let mimeType = input.mimeType?.toLowerCase();

  const dataUrlMatch = raw.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1].toLowerCase();
    raw = dataUrlMatch[2];
  }

  if (!mimeType) {
    return { error: 'mimeType é obrigatório para uploads sem data URL' };
  }

  const ext = AVATAR_MIME_TO_EXT[mimeType];
  if (!ext) {
    return { error: 'Formato de imagem não suportado. Use JPEG, PNG ou WebP.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(raw, 'base64');
  } catch {
    return { error: 'imageData inválido' };
  }

  if (buffer.length === 0) {
    return { error: 'Imagem vazia' };
  }
  if (buffer.length > AVATAR_MAX_BYTES) {
    return { error: 'Imagem excede o tamanho máximo de 3 MB' };
  }

  return { buffer, ext };
}

function avatarPublicUrl(fileName: string): string {
  return `${AVATAR_PUBLIC_PREFIX}/${fileName}`;
}

function avatarFilePathFromUrl(url: string): string | null {
  if (!url.startsWith(`${AVATAR_PUBLIC_PREFIX}/`)) return null;
  const fileName = path.basename(url);
  if (!fileName) return null;
  return path.join(AVATAR_DIR, fileName);
}

async function removeAvatarFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const filePath = avatarFilePathFromUrl(url);
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn('[UsuariosController] Falha ao remover avatar anterior:', err);
    }
  }
}

function resolveIsSuperAdminForCargo(
  cargo: string,
  actorIsSuperAdmin: boolean,
): { ok: boolean; isSuperAdmin: boolean; message?: string } {
  const c = cargo.toUpperCase();
  if (c === CARGO.ADMINISTRADOR) {
    if (!actorIsSuperAdmin) {
      return {
        ok: false,
        isSuperAdmin: false,
        message: 'Somente o dono da plataforma pode criar ou atribuir o cargo Administrador.',
      };
    }
    return { ok: true, isSuperAdmin: true };
  }
  if (c === CARGO.PASTOR) {
    return { ok: true, isSuperAdmin: false };
  }
  return { ok: true, isSuperAdmin: false };
}

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
  cargo: z.enum(['ADMINISTRADOR', 'PASTOR', 'SUPERVISOR', 'LIDER'], {
    errorMap: () => ({ message: 'Cargo deve ser ADMINISTRADOR, PASTOR, SUPERVISOR ou LIDER' })
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
  cargo: z.enum(['ADMINISTRADOR', 'PASTOR', 'SUPERVISOR', 'LIDER'], {
    errorMap: () => ({ message: 'Cargo deve ser ADMINISTRADOR, PASTOR, SUPERVISOR ou LIDER' })
  }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional()
});

// Schema para alteração de senha
const alterarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
  novaSenha: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres')
});

type SortDirection = 'asc' | 'desc';

function buildUsuarioOrderBy(sortBy: string, _dir: SortDirection) {
  switch (sortBy) {
    case 'nome':
      return [{ nome: _dir }];
    case 'whatsapp':
      return [{ whatsapp: _dir }];
    case 'cargo':
    case 'status':
      return [{ nome: 'asc' as const }];
    default:
      return [{ cargo: 'asc' as const }, { nome: 'asc' as const }];
  }
}

// Listar todos os usuários
export const listarUsuarios = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Math.max(1, Number(req.query.limit) || 10), 500);
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * perPage;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : '';
    const sortDir = req.query.sortDir === 'desc' ? 'desc' : 'asc';

    const ordemCargos = {
      'ADMINISTRADOR': 0,
      'PASTOR': 1,
      'SUPERVISOR': 2,
      'LIDER': 3,
      'MEMBRO': 4,
      'VISITANTE': 5
    };

    const orderBy = buildUsuarioOrderBy(sortBy, sortDir);

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
      orderBy,
      skip,
      take: perPage
    });

    const needsClientSort = !sortBy || sortBy === 'cargo' || sortBy === 'status';

    let usuariosOrdenados = usuarios;
    if (needsClientSort) {
      usuariosOrdenados = [...usuarios].sort((a, b) => {
        if (sortBy === 'status') {
          const rank = (u: typeof a) => {
            if (!u.senha || u.senha.length === 0) return 0;
            if (u.ativo) return 1;
            return 2;
          };
          const result = rank(a) - rank(b);
          if (result !== 0) return sortDir === 'asc' ? result : -result;
          return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
        }

        const ordemA = ordemCargos[a.cargo as keyof typeof ordemCargos] || 999;
        const ordemB = ordemCargos[b.cargo as keyof typeof ordemCargos] || 999;
        if (ordemA !== ordemB) {
          const result = ordemA - ordemB;
          return sortDir === 'asc' ? result : -result;
        }
        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
      });
    }

    const usuariosResposta = usuariosOrdenados
      .map(({ senha, ...u }) => ({
        ...u,
        possuiSenha: senha != null && senha.length > 0,
        status: u.ativo ? 'ativo' : 'inativo'
      }));

    res.json({
      usuarios: usuariosResposta,
      pagination: {
        total,
        pages: Math.ceil(total / perPage),
        currentPage,
        perPage,
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
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const userCheck = await assertUsuarioBelongsToAccount(Number(id), accountId);
    if (!userCheck.ok) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: Number(id), accountId },
      select: {
        id: true,
        nome: true,
        whatsapp: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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

    const actorIsSuperAdmin = isPlatformOwner((req as any).user?.isSuperAdmin);
    const roleMeta = resolveIsSuperAdminForCargo(dados.cargo, actorIsSuperAdmin);
    if (!roleMeta.ok) {
      return res.status(403).json({ message: roleMeta.message });
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
        ativo: comSenhaInicial,
        isSuperAdmin: roleMeta.isSuperAdmin,
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

    const actorIsSuperAdmin = isPlatformOwner((req as any).user?.isSuperAdmin);
    const roleMeta = resolveIsSuperAdminForCargo(dados.cargo, actorIsSuperAdmin);
    if (!roleMeta.ok) {
      return res.status(403).json({ message: roleMeta.message });
    }

    // Dados para atualização
    const dadosAtualizacao: any = {
      nome: dados.nome,
      whatsapp: whatsappNormalizado,
      cargo: dados.cargo,
      isSuperAdmin: roleMeta.isSuperAdmin,
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

    // Verificar se é o último pastor ativo da conta (admin da igreja)
    if (!ativo && usuarioExistente.cargo === CARGO.PASTOR) {
      const pastoresAtivos = await prisma.usuario.count({
        where: {
          accountId: usuarioExistente.accountId,
          cargo: CARGO.PASTOR,
          ativo: true,
          NOT: { id: Number(id) },
        },
      });

      if (pastoresAtivos === 0) {
        return res.status(400).json({
          message: 'Não é possível desativar o último pastor ativo desta igreja',
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

      if (!ativo && usuarioExistente.cargo === CARGO.PASTOR) {
        const pastoresAtivos = await prisma.usuario.count({
          where: {
            accountId: usuarioExistente.accountId,
            cargo: CARGO.PASTOR,
            ativo: true,
            NOT: { id },
          },
        });

        if (pastoresAtivos === 0) {
          detalhes.push({
            usuarioId: id,
            ok: false,
            erro: 'Não é possível desativar o último pastor ativo desta igreja',
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
    const accountId = getAccountId(req);
    const requestUserId = getUserId(req);

    if (!accountId || !requestUserId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const targetId = Number(id);
    if (targetId !== requestUserId) {
      return res.status(403).json({ message: 'Você só pode alterar sua própria senha' });
    }

    const userCheck = await assertUsuarioBelongsToAccount(targetId, accountId);
    if (!userCheck.ok) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const usuario = userCheck.usuario;

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
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const userCheck = await assertUsuarioBelongsToAccount(Number(id), accountId);
    if (!userCheck.ok) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Buscar celulas onde o usuário é líder ou colíder
    const celulas = await prisma.celula.findMany({
      where: {
        accountId,
        OR: [
          { liderId: Number(id) },
          { coLiderId: Number(id) },
        ],
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

/** Upload de avatar do usuário logado. Aceita data URL ou base64 puro com mimeType explícito. */
export const uploadAvatarProprio = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = getAccountId(req);

    if (!userId || !accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const parsed = uploadAvatarSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: 'Dados inválidos', errors: parsed.error.errors });
    }

    const parsedImage = parseImagePayload(parsed.data);
    if ('error' in parsedImage) {
      return res.status(400).json({ message: parsedImage.error });
    }

    await ensureAvatarDir();
    const fileName = `${userId}-${crypto.randomBytes(8).toString('hex')}.${parsedImage.ext}`;
    const filePath = path.join(AVATAR_DIR, fileName);
    await fs.writeFile(filePath, parsedImage.buffer);

    const currentUser = await prisma.usuario.findFirst({
      where: { id: userId, accountId },
      select: { avatarUrl: true },
    });

    const publicUrl = avatarPublicUrl(fileName);
    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: { avatarUrl: publicUrl },
      select: { id: true, avatarUrl: true },
    });

    if (currentUser?.avatarUrl && currentUser.avatarUrl !== publicUrl) {
      await removeAvatarFile(currentUser.avatarUrl);
    }

    return res.json(updated);
  } catch (error) {
    console.error('[UsuariosController] Erro ao enviar avatar:', error);
    return res.status(500).json({ message: 'Erro ao enviar avatar' });
  }
};

/** Remove avatar do usuário logado e limpa o arquivo do disco. */
export const removerAvatarProprio = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const accountId = getAccountId(req);

    if (!userId || !accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const currentUser = await prisma.usuario.findFirst({
      where: { id: userId, accountId },
      select: { avatarUrl: true },
    });

    if (currentUser?.avatarUrl) {
      await removeAvatarFile(currentUser.avatarUrl);
    }

    await prisma.usuario.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return res.json({ success: true, avatarUrl: null });
  } catch (error) {
    console.error('[UsuariosController] Erro ao remover avatar:', error);
    return res.status(500).json({ message: 'Erro ao remover avatar' });
  }
};
