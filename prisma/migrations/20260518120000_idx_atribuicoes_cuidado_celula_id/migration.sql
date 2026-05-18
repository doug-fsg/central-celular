-- Ajuda agregações por célula na rede de cuidado (Q1/Q3)
CREATE INDEX IF NOT EXISTS idx_atribuicoes_cuidado_celula_id
  ON atribuicoes_cuidado(celula_id);
