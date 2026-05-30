-- CreateEnum
CREATE TYPE "PublicoCelula" AS ENUM ('homens', 'mulheres', 'misto', 'nao_informado');

-- AlterTable
ALTER TABLE "celulas" ADD COLUMN "publico" "PublicoCelula" NOT NULL DEFAULT 'nao_informado';
