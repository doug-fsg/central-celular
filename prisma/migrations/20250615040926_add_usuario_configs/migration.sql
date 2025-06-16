-- CreateTable
CREATE TABLE "usuario_configs" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "notificacao_aniversario_ativa" BOOLEAN NOT NULL DEFAULT true,
    "dias_antecedencia_1" INTEGER NOT NULL DEFAULT 3,
    "dias_antecedencia_2" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_configs_usuario_id_key" ON "usuario_configs"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuario_configs" ADD CONSTRAINT "usuario_configs_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
