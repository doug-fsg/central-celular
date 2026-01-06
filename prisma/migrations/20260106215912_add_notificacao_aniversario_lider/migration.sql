-- AlterTable
ALTER TABLE "usuario_configs" ADD COLUMN     "dias_antecedencia_lider_1" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "dias_antecedencia_lider_2" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notificacao_aniversario_lider_ativa" BOOLEAN NOT NULL DEFAULT false;
