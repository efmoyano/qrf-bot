-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Player_guildId_active_idx" ON "Player"("guildId", "active");
