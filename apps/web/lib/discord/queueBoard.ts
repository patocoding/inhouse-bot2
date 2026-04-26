import type { SupabaseClient } from "@supabase/supabase-js";

export const LANES = ["TOP", "JG", "MID", "ADC"] as const;
export type Lane = (typeof LANES)[number];

export function isLane(s: string): s is Lane {
  return (LANES as readonly string[]).includes(s);
}

type QueueRow = {
  joined_at: string;
  lane: string;
  profiles: {
    display_name: string | null;
    mmr: number;
    discord_user_id: string | null;
  } | null;
};

function buildEmbedBody(rows: QueueRow[]): { title: string; description: string } {
  const n = rows.length;
  const title = `Fila Inhouse — ${n}/10`;
  if (n === 0) {
    return {
      title,
      description:
        "Fila vazia.\n\nUsa `/entrar` e escolhe **lane**: TOP, JG, MID ou ADC.\nO painel atualiza automaticamente.",
    };
  }
  const lines = rows.map((r, i) => {
    const pr = r.profiles;
    const mmr = pr?.mmr != null ? Math.round(pr.mmr) : "—";
    const mention = pr?.discord_user_id ? `<@${pr.discord_user_id}>` : "—";
    const name = pr?.display_name?.trim() || "—";
    const lane = (r.lane as string) || "—";
    return `**${i + 1}.** ${mention} · **${lane}** · MMR ${mmr}\n_${name}_`;
  });
  return {
    title,
    description: lines.join("\n\n").slice(0, 3900),
  };
}

/**
 * Cria ou edita a mensagem embed do painel da fila no canal.
 */
export async function syncQueueBoardMessage(
  supabase: SupabaseClient,
  botToken: string,
  guildId: string,
  channelId: string
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("queue_entries")
    .select("joined_at, lane, profiles(display_name, mmr, discord_user_id)")
    .eq("guild_id", guildId)
    .order("joined_at", { ascending: true });
  if (error) {
    throw new Error("syncQueueBoardMessage: " + error.message);
  }
  const list = (rows ?? []) as unknown as QueueRow[];
  const { title, description } = buildEmbedBody(list);

  const embed = {
    title,
    description,
    color: 0x3b82f6,
    footer: { text: "Atualizado automaticamente · posições por ordem de entrada" },
    timestamp: new Date().toISOString(),
  };

  const { data: board } = await supabase
    .from("queue_boards")
    .select("channel_id, message_id")
    .eq("guild_id", guildId)
    .maybeSingle();

  const api = (path: string, init: RequestInit) =>
    fetch(`https://discord.com/api/v10${path}`, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bot ${botToken}`,
        "content-type": "application/json",
      },
    });

  if (!board?.message_id || !board.channel_id) {
    const r = await api(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`criar painel: ${r.status} ${t}`);
    }
    const msg = (await r.json()) as { id: string };
    await supabase.from("queue_boards").upsert(
      {
        guild_id: guildId,
        channel_id: channelId,
        message_id: msg.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "guild_id" }
    );
    return;
  }

  let r = await api(`/channels/${board.channel_id}/messages/${board.message_id}`, {
    method: "PATCH",
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (r.status === 404) {
    const cr = await api(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!cr.ok) {
      const t = await cr.text();
      throw new Error(`recriar painel: ${cr.status} ${t}`);
    }
    const msg = (await cr.json()) as { id: string };
    await supabase
      .from("queue_boards")
      .update({
        channel_id: channelId,
        message_id: msg.id,
        updated_at: new Date().toISOString(),
      })
      .eq("guild_id", guildId);
    return;
  }

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`atualizar painel: ${r.status} ${t}`);
  }
}
