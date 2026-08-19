-- CreateIndex
CREATE INDEX "celulas_account_id_ativo_idx" ON "celulas"("account_id", "ativo");

-- CreateIndex
CREATE INDEX "celulas_lider_id_idx" ON "celulas"("lider_id");

-- CreateIndex
CREATE INDEX "membros_celula_id_ativo_idx" ON "membros"("celula_id", "ativo");

-- CreateIndex
CREATE INDEX "otp_codes_whatsapp_account_id_used_expiresAt_idx" ON "otp_codes"("whatsapp", "account_id", "used", "expiresAt");

-- CreateIndex
CREATE INDEX "presencas_relatorio_id_tipo_status_idx" ON "presencas"("relatorio_id", "tipo", "status");

-- CreateIndex
CREATE INDEX "presencas_membro_id_idx" ON "presencas"("membro_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_revoked_at_expires_at_idx" ON "refresh_tokens"("usuario_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "relatorios_celula_id_status_data_inicio_idx" ON "relatorios"("celula_id", "status", "data_inicio");

-- CreateIndex
CREATE INDEX "relatorios_status_data_inicio_data_fim_idx" ON "relatorios"("status", "data_inicio", "data_fim");

-- CreateIndex
CREATE INDEX "usuarios_account_id_ativo_idx" ON "usuarios"("account_id", "ativo");
