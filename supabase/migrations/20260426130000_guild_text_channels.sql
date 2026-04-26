-- Onde a fila e o ranking mostram painéis (por servidor)
CREATE TABLE public.guild_text_channels (
  guild_id text PRIMARY KEY,
  queue_channel_id text,
  ranking_channel_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guild_text_channels_updated_idx ON public.guild_text_channels (updated_at DESC);

ALTER TABLE public.guild_text_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct guild_text_channels" ON public.guild_text_channels
  FOR ALL USING (false);

COMMENT ON TABLE public.guild_text_channels IS 'Canais fixos: fila (painel) e ranking; definidos por /canais (staff)';

-- Mensagem embed do ranking (análogo a queue_boards)
CREATE TABLE public.ranking_boards (
  guild_id text PRIMARY KEY,
  channel_id text NOT NULL,
  message_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ranking_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct ranking_boards" ON public.ranking_boards
  FOR ALL USING (false);

COMMENT ON TABLE public.ranking_boards IS 'ID da mensagem do painel de ranking (top 20)';
