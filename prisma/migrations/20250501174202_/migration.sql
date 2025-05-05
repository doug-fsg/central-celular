-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "foto_perfil" TEXT,
ADD COLUMN     "lider_destaque" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "meses_consecutivos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ultima_verificacao" TIMESTAMP(3);
