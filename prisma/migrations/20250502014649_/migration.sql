-- AlterTable
ALTER TABLE "relatorios" ADD COLUMN     "enviado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "data_envio" DROP NOT NULL,
ALTER COLUMN "data_envio" DROP DEFAULT;
