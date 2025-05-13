-- Primeiro tornar a senha opcional
ALTER TABLE "usuarios" ALTER COLUMN "senha" DROP NOT NULL;

-- Atualizar registros existentes com whatsapp NULL
UPDATE "usuarios" 
SET "whatsapp" = 'PENDENTE_' || id::text 
WHERE "whatsapp" IS NULL;

-- Agora podemos fazer o whatsapp required
ALTER TABLE "usuarios" ALTER COLUMN "whatsapp" SET NOT NULL; 