import type { SupabaseClient } from "@supabase/supabase-js";

export type GuildTextChannelsRow = {
  guild_id: string;
  queue_channel_id: string | null;
  ranking_channel_id: string | null;
};

/**
 * Lê a config de canais; se a fila tiver `queue_channel_id`, usa essa; senão o canal do evento.
 */
export async function resolveQueueChannelId(
  supabase: SupabaseClient,
  guildId: string,
  eventChannelId: string | null | undefined
): Promise<string | null> {
  const { data } = await supabase
    .from("guild_text_channels")
    .select("queue_channel_id")
    .eq("guild_id", guildId)
    .maybeSingle();
  const row = data as { queue_channel_id: string | null } | null;
  if (row?.queue_channel_id?.trim()) {
    return row.queue_channel_id.trim();
  }
  return eventChannelId ?? null;
}

/**
 * Onde o ranking é editado, ou null (só resposta do comando, sem painel no canal).
 */
export async function resolveRankingChannelId(
  supabase: SupabaseClient,
  guildId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("guild_text_channels")
    .select("ranking_channel_id")
    .eq("guild_id", guildId)
    .maybeSingle();
  const row = data as { ranking_channel_id: string | null } | null;
  if (row?.ranking_channel_id?.trim()) {
    return row.ranking_channel_id.trim();
  }
  return null;
}

/**
 * Cria ou actualiza a linha do guild sem apagar a outra coluna.
 */
export async function patchGuildTextChannels(
  supabase: SupabaseClient,
  guildId: string,
  patch: { queue_channel_id?: string; ranking_channel_id?: string }
): Promise<void> {
  const { data: row } = await supabase
    .from("guild_text_channels")
    .select("queue_channel_id, ranking_channel_id")
    .eq("guild_id", guildId)
    .maybeSingle();
  const cur = (row as GuildTextChannelsRow | null) ?? {
    queue_channel_id: null,
    ranking_channel_id: null,
  };
  const nextQ = "queue_channel_id" in patch ? patch.queue_channel_id : cur.queue_channel_id;
  const nextR = "ranking_channel_id" in patch ? patch.ranking_channel_id : cur.ranking_channel_id;
  const { error } = await supabase.from("guild_text_channels").upsert(
    {
      guild_id: guildId,
      queue_channel_id: nextQ,
      ranking_channel_id: nextR,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "guild_id" }
  );
  if (error) {
    throw error;
  }
}
