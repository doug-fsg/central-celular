-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "celulas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "diaSemana" TEXT NOT NULL,
    "horario" TEXT NOT NULL,
    "lider_id" INTEGER NOT NULL,
    "colider_id" INTEGER,
    "regiao_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "celulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros_celula" (
    "id" SERIAL NOT NULL,
    "celula_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "eh_consolidador" BOOLEAN NOT NULL DEFAULT false,
    "data_cadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,

    CONSTRAINT "membros_celula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regioes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "supervisor_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "regioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relatorios" (
    "id" SERIAL NOT NULL,
    "celula_id" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "data_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacoes" TEXT,

    CONSTRAINT "relatorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presencas" (
    "id" SERIAL NOT NULL,
    "relatorio_id" INTEGER NOT NULL,
    "membro_celula_id" INTEGER NOT NULL,
    "presenca_celula" BOOLEAN NOT NULL DEFAULT false,
    "presenca_culto" BOOLEAN NOT NULL DEFAULT false,
    "semana" INTEGER NOT NULL,
    "observacoes" TEXT,

    CONSTRAINT "presencas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conquistas" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_conclusao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,

    CONSTRAINT "conquistas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_celula_celula_id_usuario_id_key" ON "membros_celula"("celula_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "relatorios_celula_id_mes_ano_key" ON "relatorios"("celula_id", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "presencas_relatorio_id_membro_celula_id_semana_key" ON "presencas"("relatorio_id", "membro_celula_id", "semana");

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_lider_id_fkey" FOREIGN KEY ("lider_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_colider_id_fkey" FOREIGN KEY ("colider_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_regiao_id_fkey" FOREIGN KEY ("regiao_id") REFERENCES "regioes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_celula" ADD CONSTRAINT "membros_celula_celula_id_fkey" FOREIGN KEY ("celula_id") REFERENCES "celulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membros_celula" ADD CONSTRAINT "membros_celula_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relatorios" ADD CONSTRAINT "relatorios_celula_id_fkey" FOREIGN KEY ("celula_id") REFERENCES "celulas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_relatorio_id_fkey" FOREIGN KEY ("relatorio_id") REFERENCES "relatorios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_membro_celula_id_fkey" FOREIGN KEY ("membro_celula_id") REFERENCES "membros_celula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conquistas" ADD CONSTRAINT "conquistas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
