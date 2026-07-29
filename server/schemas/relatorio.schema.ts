import { z } from 'zod';

export const listarRelatoriosQuerySchema = z.object({
  celulaId: z.coerce.number().int().positive(),
  dataInicio: z.string().min(1),
  dataFim: z.string().min(1),
  evento: z.coerce.number().int().optional(),
});

export const criarRelatorioSchema = z.object({
  celulaId: z.number().int().positive(),
  dataInicio: z.string(),
  dataFim: z.string(),
  evento: z.number().int().optional(),
  observacoes: z.string().optional(),
});

export const atualizarRelatorioSchema = z.object({
  observacoes: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});

export const presencaSchema = z.object({
  membroId: z.number().int().positive(),
  status: z.number().int(),
  tipo: z.number().int().optional(),
});
