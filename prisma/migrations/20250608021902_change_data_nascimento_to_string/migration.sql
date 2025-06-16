-- Converter a coluna data_nascimento para texto mantendo o formato YYYY-MM-DD
ALTER TABLE membros ALTER COLUMN data_nascimento TYPE text USING to_char(data_nascimento, 'YYYY-MM-DD'); 