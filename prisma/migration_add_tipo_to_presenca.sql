-- Adicionar coluna tipo à tabela presencas com o tipo INT
ALTER TABLE presencas ADD COLUMN tipo INT DEFAULT 0 NOT NULL;

-- Remover a restrição de unicidade antiga, se existir
ALTER TABLE presencas DROP CONSTRAINT IF EXISTS presencas_relatorio_id_membro_id_key;

-- Adicionar nova restrição de unicidade incluindo o campo tipo
ALTER TABLE presencas ADD CONSTRAINT presencas_relatorio_id_membro_id_tipo_key UNIQUE (relatorio_id, membro_id, tipo);

-- Atualizar registros existentes para ter tipo=0 onde a coluna foi criada como NULL
UPDATE presencas SET tipo = 0 WHERE tipo IS NULL; 