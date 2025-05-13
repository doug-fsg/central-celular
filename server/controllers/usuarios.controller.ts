import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Schema de validação para criar usuário
const criarUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  whatsapp: z.string()
    .min(10, 'WhatsApp deve ter pelo menos 10 dígitos')
    .max(13, 'WhatsApp deve ter no máximo 13 dígitos')
    .regex(/^\d+$/, 'WhatsApp deve conter apenas números'),
  cargo: z.enum(['ADMINISTRADOR', 'SUPERVISOR', 'LIDER'], {
    errorMap: () => ({ message: 'Cargo deve ser ADMINISTRADOR, SUPERVISOR ou LIDER' })
  }),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional()
});

// Schema de validação para atualizar usuário
const atualizarUsuarioSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
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
        email: true,
        whatsapp: true,
        cargo: true,
        ativo: true,
        createdAt: true,
        updatedAt: true,
        accountId: true
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
      .map(u => ({
        ...u,
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
        email: true,
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

    // Verificar se já existe usuário com mesmo email ou whatsapp na account
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    if (dados.email) {
      const usuarioExistente = await prisma.usuario.findFirst({
        where: {
          email: dados.email,
          accountId: accountId
        }
      });

      if (usuarioExistente) {
        return res.status(400).json({ message: 'Já existe um usuário com este email' });
      }
    }

    if (dados.whatsapp) {
      const usuarioExistente = await prisma.usuario.findFirst({
        where: {
          whatsapp: dados.whatsapp,
          accountId: accountId
        }
      });

      if (usuarioExistente) {
        return res.status(400).json({ message: 'Já existe um usuário com este WhatsApp' });
      }
    }

    // Criar usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email || null,
        whatsapp: dados.whatsapp,
        cargo: dados.cargo,
        senha: dados.senha ? await bcrypt.hash(dados.senha, 10) : null,
        accountId: accountId,
        ativo: true
      }
    });

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    res.status(201).json(usuarioSemSenha);
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

// Atualizar um usuário existente
export const atualizarUsuario = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validar dados de entrada
    const dados = atualizarUsuarioSchema.parse(req.body);

    // Verificar se usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({ 
      where: { id: Number(id) } 
    });
    
    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o email já está em uso por outro usuário
    if (dados.email !== usuarioExistente.email) {
      const emailExistente = await prisma.usuario.findUnique({ 
        where: { email: dados.email } 
      });
      
      if (emailExistente) {
        return res.status(400).json({ message: 'Email já está em uso' });
      }
    }

    // Dados para atualização
    const dadosAtualizacao: any = {
      nome: dados.nome,
      email: dados.email || null,
      whatsapp: dados.whatsapp,
      cargo: dados.cargo
    };

    // Se a senha foi fornecida, hash e atualiza
    if (dados.senha) {
      const salt = await bcrypt.genSalt(10);
      dadosAtualizacao.senha = await bcrypt.hash(dados.senha, salt);
    }

    // Atualizar usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: Number(id) },
      data: dadosAtualizacao
    });

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = usuarioAtualizado;
    res.json(usuarioSemSenha);
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

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = usuarioAtualizado;
    res.json({
      ...usuarioSemSenha,
      status: usuarioAtualizado.ativo ? 'ativo' : 'inativo'
    });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do usuário' });
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