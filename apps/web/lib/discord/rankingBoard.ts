import type { SupabaseClient } from "@supabase/supabase-js";

type ProfileRankRow = {
  display_name: string | null;
  mmr: number;
  wins: number | null;
  losses: number | null;
  discord_user_id: string | null;
};

/**
 * Cria ou edita a mensagem do Top 20 MMR no canal de ranking.
 */
export async function syncRankingBoardMessage(
  supabase: SupabaseClient,
  botToken: string,
  guildId: string,
  channelId: string
): Promise<void> {
  const { data: top, error } = await supabase
    .from("profiles")
    .select("display_name, mmr, wins, losses, discord_user_id")
    .order("mmr", { ascending: false })
    .limit(20);
  if (error) {
    throw new Error("syncRankingBoardMessage: " + error.message);
  }
  const list = (top ?? []) as ProfileRankRow[];
  const lines = list.map((p, i) => {
    const w = p.wins ?? 0;
    const l = p.losses ?? 0;
    const who =
      p.display_name?.trim() || (p.discord_user_id ? `${p.discord_user_id.slice(0, 6)}…` : "—");
    return `**\`${i + 1}\`** ${who} — **${(Math.round(p.mmr * 10) / 10).toFixed(1)}** (${w}V/${l}D)`;
  });
  const body =
    list.length === 0
      ? "Sem perfis ainda. Usa o site e `/vincular`."
      : lines.join("\n");
  const embed: Record<string, unknown> = {
    title: "Top 20 — MMR (todos os perfis vinculados)",
    description: body.slice(0, 4000),
    color: 0xf59e0b,
    footer: { text: "Atualiza com /resultado, /canais ranking ou /ranking" },
    timestamp: new Date().toISOString(),
  };

  const { data: board } = await supabase
    .from("ranking_boards")
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
      throw new Error(`criar painel ranking: ${r.status} ${t}`);
    }
    const msg = (await r.json()) as { id: string };
    await supabase.from("ranking_boards").upsert(
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
      throw new Error(`recriar painel ranking: ${cr.status} ${t}`);
    }
    const msg = (await cr.json()) as { id: string };
    await supabase
      .from("ranking_boards")
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
    throw new Error(`atualizar painel ranking: ${r.status} ${t}`);
  }
}
