/*
  # Add performance indexes

  1. Indexes
    - Add indexes for frequently queried columns
    - Improve query performance for common operations
*/

-- Add indexes for foreign keys and frequently queried columns
CREATE INDEX IF NOT EXISTS idx_celulas_lider ON celulas(lider_id);
CREATE INDEX IF NOT EXISTS idx_celulas_colider ON celulas(colider_id);
CREATE INDEX IF NOT EXISTS idx_celulas_regiao ON celulas(regiao_id);

CREATE INDEX IF NOT EXISTS idx_membros_celula ON membros(celula_id);
CREATE INDEX IF NOT EXISTS idx_membros_email ON membros(email);

CREATE INDEX IF NOT EXISTS idx_relatorios_celula_data ON relatorios(celula_id, mes, ano);
CREATE INDEX IF NOT EXISTS idx_relatorios_data_envio ON relatorios(data_envio);

CREATE INDEX IF NOT EXISTS idx_presencas_relatorio ON presencas(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_presencas_membro ON presencas(membro_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_data ON notificacoes(data_criacao);

CREATE INDEX IF NOT EXISTS idx_conquistas_usuario ON conquistas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conquistas_data ON conquistas(data_conclusao);