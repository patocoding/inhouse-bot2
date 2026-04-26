import type { SupabaseClient } from "@supabase/supabase-js";

export const LANES = ["TOP", "JG", "MID", "ADC"] as const;
export type Lane = (typeof LANES)[number];

const LANE_LABEL: Record<Lane, string> = {
  TOP: "TOP",
  JG: "JG",
  MID: "MID",
  ADC: "ADC",
};

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

type DiscordEmbedField = { name: string; value: string; inline: boolean };

function buildQueueEmbedPayload(rows: QueueRow[]): {
  title: string;
  description: string;
  fields: DiscordEmbedField[];
} {
  const n = rows.length;
  const title = "Fila Inhouse";
  if (n === 0) {
    return {
      title,
      description:
        "**0/10** na fila.\n\nUsa `/entrar` e escolhe a tua **lane** (TOP, JG, MID, ADC). Esta mensagem **atualiza** quando alguém entra, sai ou a staff dá **sortear**.",
      fields: LANES.map((lane) => ({
        name: `${LANE_LABEL[lane]} (0)`,
        value: "— *ninguém* —",
        inline: true,
      })),
    };
  }

  // Posição global = ordem de `joined_at` (já vem ordenado da query)
  const byLane: Record<Lane, { gpos: number; r: QueueRow }[]> = {
    TOP: [],
    JG: [],
    MID: [],
    ADC: [],
  };
  rows.forEach((r, i) => {
    const raw = ((r.lane as string) || "TOP").toUpperCase();
    const lane = (LANES as readonly string[]).includes(raw) ? (raw as Lane) : "TOP";
    byLane[lane].push({ gpos: i + 1, r });
  });

  const linesGlobal = rows
    .map((r, i) => {
      const pr = r.profiles;
      const m = pr?.discord_user_id ? `<@${pr.discord_user_id}>` : "—";
      return `\`${i + 1}\` ${m}`;
    })
    .join(" → ");
  const desc =
    `**${n}/10** · \`#n\` = posição **global** (ordem de chegada).\nAbaixo: quem está em **cada lane**.\n\n` +
    `**Ordem geral:** ${linesGlobal}`.slice(0, 3800);

  const fields: DiscordEmbedField[] = LANES.map((lane) => {
    const pl = byLane[lane];
    const count = pl.length;
    const value =
      count === 0
        ? "— *vazio* —"
        : pl
            .map(({ gpos, r }) => {
              const pr = r.profiles;
              const mmr = pr?.mmr != null ? Math.round(pr.mmr) : "—";
              const mention = pr?.discord_user_id ? `<@${pr.discord_user_id}>` : "—";
              return `**\`#${gpos}\`** ${mention} · MMR **${mmr}**`;
            })
            .join("\n");
    return {
      name: `${LANE_LABEL[lane]} (${count})`,
      value: value.slice(0, 1020),
      inline: true,
    };
  });

  return { title, description: desc, fields };
}

/**
 * Cria ou edita a mensagem embed do painel da fila no canal.
 * Atualiza em tempo real = sempre que o handler chama isto (entrar/sair/sortear).
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
  const { title, description, fields } = buildQueueEmbedPayload(list);

  const embed: Record<string, unknown> = {
    title,
    description,
    fields,
    color: 0x3b82f6,
    footer: {
      text: "Atualiza ao entrar, sair ou sortear — mantém este canal aberto",
    },
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
