import { z } from "zod";

const server = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DISCORD_PUBLIC_KEY: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_BOT_TOKEN: z.string().min(1),
  DISCORD_STAFF_ROLE_IDS: z.string().optional().default(""),
});

export function getServerEnv() {
  return server.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DISCORD_PUBLIC_KEY: process.env.DISCORD_PUBLIC_KEY,
    DISCORD_APPLICATION_ID: process.env.DISCORD_APPLICATION_ID,
    DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
    DISCORD_STAFF_ROLE_IDS: process.env.DISCORD_STAFF_ROLE_IDS,
  });
}

export function staffRoleIdsFromEnv(): Set<string> {
  const s = (process.env.DISCORD_STAFF_ROLE_IDS ?? "").trim();
  if (!s) return new Set();
  return new Set(
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

export function isStaffGuildMember(roles: string[] | undefined): boolean {
  const need = staffRoleIdsFromEnv();
  if (need.size === 0) return true;
  if (!roles?.length) return false;
  return roles.some((r) => need.has(r));
}
