-- Lane na fila + painel persistente (mensagem) por servidor

ALTER TABLE public.queue_entries
  ADD COLUMN IF NOT EXISTS lane text;

UPDATE public.queue_entries SET lane = 'TOP' WHERE lane IS NULL;

ALTER TABLE public.queue_entries
  ALTER COLUMN lane SET NOT NULL;

ALTER TABLE public.queue_entries
  ADD CONSTRAINT queue_entries_lane_check CHECK (lane IN ('TOP', 'JG', 'MID', 'ADC'));

CREATE TABLE public.queue_boards (
  guild_id text PRIMARY KEY,
  channel_id text NOT NULL,
  message_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.queue_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct queue_boards access" ON public.queue_boards
  FOR ALL USING (false);

COMMENT ON TABLE public.queue_boards IS 'IDs da mensagem embed do painel da fila (atualizado pelo bot)';
