-- AlterTable
ALTER TABLE membros ALTER COLUMN data_nascimento TYPE DATE USING data_nascimento::DATE; 