import "dotenv/config";

export const env = {
  token: process.env.DISCORD_TOKEN!,
  clientId: process.env.DISCORD_CLIENT_ID!,
  timezone: process.env.TIMEZONE ?? "UTC",
  adminRole: process.env.ADMIN_ROLE_NAME ?? "Desert Storm Admin",
};

if (!env.token || !env.clientId || !process.env.DATABASE_URL) {
  throw new Error("Missing DISCORD_TOKEN, DISCORD_CLIENT_ID or DATABASE_URL");
}
