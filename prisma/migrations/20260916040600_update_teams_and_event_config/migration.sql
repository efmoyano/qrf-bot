-- AlterEnum
BEGIN;
CREATE TYPE "Team_new" AS ENUM ('TEAM_A', 'TEAM_B');
ALTER TABLE "Event" ALTER COLUMN "team" TYPE "Team_new" USING (
  CASE 
    WHEN "team"::text = 'MORNING' THEN 'TEAM_A'::"Team_new"
    WHEN "team"::text = 'NIGHT' THEN 'TEAM_B'::"Team_new"
    ELSE 'TEAM_A'::"Team_new"
  END
);
ALTER TYPE "Team" RENAME TO "Team_old";
ALTER TYPE "Team_new" RENAME TO "Team";
DROP TYPE "public"."Team_old";
COMMIT;

-- AlterTable
ALTER TABLE "EventConfig" DROP COLUMN "morningCron",
DROP COLUMN "nightCron",
DROP COLUMN "registrationCron",
ADD COLUMN     "announcementCron" TEXT NOT NULL DEFAULT '0 23 * * 6';
