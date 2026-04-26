-- Inhouse LoL: schema, RLS, profile bootstrap
-- MMR: numeric (Elo), match logging, queues, link codes

-- Extensão para geração de tokens (se disponível; fallback em app)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Perfil: 1:1 com auth.users
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  discord_user_id text UNIQUE,
  summoner_riot text,
  mmr double precision NOT NULL DEFAULT 1500,
  games_played int NOT NULL DEFAULT 0,
  wins int NOT NULL DEFAULT 0,
  losses int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Códigos de vínculo Discord (gerados no site com sessão)
CREATE TABLE public.link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT link_codes_code_format CHECK (code ~ '^[A-Z0-9]{6,12}$')
);

CREATE UNIQUE INDEX link_codes_code_active_idx ON public.link_codes (code)
  WHERE used_at IS NULL;

CREATE INDEX link_codes_user_idx ON public.link_codes (user_id);

-- Fila por servidor Discord
CREATE TABLE public.queue_entries (
  id bigserial PRIMARY KEY,
  guild_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, user_id)
);

CREATE INDEX queue_entries_guild_idx ON public.queue_entries (guild_id, joined_at);

-- Partidas
CREATE TYPE public.match_status AS ENUM ('pending', 'completed', 'cancelled');

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  status public.match_status NOT NULL DEFAULT 'pending',
  team_a_mmr_mean double precision,
  team_b_mmr_mean double precision,
  winner char(1) CHECK (winner IS NULL OR winner IN ('A', 'B')),
  k_factor double precision NOT NULL DEFAULT 24,
  idempotency_key text,
  created_by_discord_user_id text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_idem_unique UNIQUE (idempotency_key)
);

CREATE INDEX matches_guild_status_idx ON public.matches (guild_id, status, created_at DESC);

CREATE TABLE public.match_participants (
  match_id uuid NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  team char(1) NOT NULL CHECK (team IN ('A', 'B')),
  mmr_before double precision NOT NULL,
  mmr_delta double precision NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, user_id)
);

-- Trigger: cria profile ao signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Ranking: qualquer sessão autenticada lê perfis (MMR, nomes) para a página de ranking
CREATE POLICY "Authed can read all profiles for ranking" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- link_codes: só o dono
CREATE POLICY "Users manage own link codes" ON public.link_codes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fila, partidas: não expor ao cliente; apenas service role (bot) usa
CREATE POLICY "No direct queue access" ON public.queue_entries
  FOR ALL USING (false);

CREATE POLICY "No direct matches access" ON public.matches
  FOR ALL USING (false);

CREATE POLICY "No direct match_participants access" ON public.match_participants
  FOR ALL USING (false);

COMMENT ON TABLE public.profiles IS 'Sincronizado com auth.users; discord_user_id após /vincular';
COMMENT ON TABLE public.matches IS 'Resultados e MMR: escritos pelo handler do bot (service role)';
