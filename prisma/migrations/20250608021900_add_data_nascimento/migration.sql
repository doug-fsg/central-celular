-- Adicionar coluna data_nascimento à tabela membros
ALTER TABLE membros ADD COLUMN IF NOT EXISTS data_nascimento TIMESTAMP(3);

-- Remover coluna email da tabela membros que não é mais utilizada
ALTER TABLE membros DROP COLUMN IF EXISTS email; 