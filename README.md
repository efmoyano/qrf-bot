# Last War Discord Bot

TypeScript + discord.js + Prisma + PostgreSQL.

## Requirements
- Node.js 22+
- PostgreSQL
- Discord application/bot token
- Discord application client ID

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DATABASE_URL`.
3. Install:
   `npm install`
4. Generate Prisma client:
   `npm run db:generate`
5. Create database schema:
   `npm run db:migrate -- --name init`
6. Register slash commands:
   `npm run register-commands`
7. Run:
   `npm run dev`

## Commands

### Players
- `/profile register name squad power`
- `/profile update [name] [squad] [power]`
- `/profile me`

### Storm
- `/storm register event team`
- `/storm unregister event team`
- `/storm list event team`
- `/storm create event team start close`

### Admin
- `/storm-admin config event morning-cron night-cron channel`
- `/storm-admin upcoming`

## Important
The automatic posting scheduler currently creates the next event using a one-hour-ahead placeholder. For production, replace that calculation with the actual event schedule source/configuration. The data model already separates Morning/Night teams and stores exact start/registration-close times.

Power is stored as an integer number of units, so `82.4M` becomes `82400000` and avoids floating-point errors.
