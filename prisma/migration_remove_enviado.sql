-- Remover o campo redundante 'enviado' da tabela relatorios
ALTER TABLE relatorios DROP COLUMN IF EXISTS enviado;

-- Garantir que o campo data_envio seja null por padrão
ALTER TABLE relatorios ALTER COLUMN data_envio DROP NOT NULL; 