-- CreateEnum
CREATE TYPE "PlayerTag" AS ENUM ('STAR', 'BLUE', 'WHITE', 'RED');

-- CreateEnum
CREATE TYPE "ParticipationRole" AS ENUM ('MAIN', 'SUBSTITUTE', 'UNSELECTED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'ATTENDED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "attendanceCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "noShowCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tag" "PlayerTag" NOT NULL DEFAULT 'WHITE';

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "role" "ParticipationRole" NOT NULL DEFAULT 'UNSELECTED';

-- CreateIndex
CREATE INDEX "Player_guildId_tag_idx" ON "Player"("guildId", "tag");

-- CreateIndex
CREATE INDEX "Registration_eventId_role_idx" ON "Registration"("eventId", "role");
