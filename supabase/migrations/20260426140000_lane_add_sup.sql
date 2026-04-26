-- Inclui lane SUP (suporte) além de TOP, JG, MID, ADC
ALTER TABLE public.queue_entries DROP CONSTRAINT IF EXISTS queue_entries_lane_check;
ALTER TABLE public.queue_entries
  ADD CONSTRAINT queue_entries_lane_check CHECK (lane IN ('TOP', 'JG', 'MID', 'ADC', 'SUP'));
