-- CreateTable: Rede de Cuidado
CREATE TABLE "atribuicoes_cuidado" (
    "id" SERIAL NOT NULL,
    "celula_id" INTEGER NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "consolidador_id" INTEGER,
    "lider_id" INTEGER,
    "criado_por_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atribuicoes_cuidado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: um membro só pode ter um cuidador
CREATE UNIQUE INDEX "atribuicoes_cuidado_membro_id_key" ON "atribuicoes_cuidado"("membro_id");

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_celula_id_fkey"
    FOREIGN KEY ("celula_id") REFERENCES "celulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_membro_id_fkey"
    FOREIGN KEY ("membro_id") REFERENCES "membros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_consolidador_id_fkey"
    FOREIGN KEY ("consolidador_id") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_lider_id_fkey"
    FOREIGN KEY ("lider_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atribuicoes_cuidado" ADD CONSTRAINT "atribuicoes_cuidado_criado_por_id_fkey"
    FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
