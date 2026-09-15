-- CreateEnum
CREATE TYPE "SquadType" AS ENUM ('TANK', 'AIR', 'MISSILE');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DESERT_STORM', 'CANYON_STORM');

-- CreateEnum
CREATE TYPE "Team" AS ENUM ('MORNING', 'NIGHT');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "squadType" "SquadType" NOT NULL,
    "power" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "morningCron" TEXT NOT NULL,
    "nightCron" TEXT NOT NULL,
    "registrationCron" TEXT,
    "channelId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "team" "Team" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "messageId" TEXT,
    "channelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "powerSnapshot" BIGINT NOT NULL,
    "squadSnapshot" "SquadType" NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Player_guildId_gameName_idx" ON "Player"("guildId", "gameName");

-- CreateIndex
CREATE UNIQUE INDEX "Player_guildId_discordId_key" ON "Player"("guildId", "discordId");

-- CreateIndex
CREATE UNIQUE INDEX "EventConfig_guildId_eventType_key" ON "EventConfig"("guildId", "eventType");

-- CreateIndex
CREATE INDEX "Event_guildId_type_startsAt_idx" ON "Event"("guildId", "type", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Event_guildId_type_team_startsAt_key" ON "Event"("guildId", "type", "team", "startsAt");

-- CreateIndex
CREATE INDEX "Registration_playerId_idx" ON "Registration"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_playerId_key" ON "Registration"("eventId", "playerId");

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
