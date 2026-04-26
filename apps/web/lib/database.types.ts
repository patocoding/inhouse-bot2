/** Tipos mínimos para o cliente sem gerar types do Supabase CLI. */

export type LinkCodeRow = {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
};

export type ProfileRow = {
  id: string;
  display_name: string | null;
  discord_user_id: string | null;
  summoner_riot: string | null;
  mmr: number;
  games_played: number;
  wins: number;
  losses: number;
};

export type MatchRow = {
  id: string;
  guild_id: string;
  status: string;
  winner: string | null;
};

export type MatchParticipantRow = {
  user_id: string;
  team: string;
  mmr_before: number;
};
