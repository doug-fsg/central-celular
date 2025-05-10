-- AlterTable
ALTER TABLE "celulas" ADD COLUMN "supervisor_id" INTEGER;

-- AddForeignKey
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE; 