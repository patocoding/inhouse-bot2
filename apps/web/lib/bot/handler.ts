import { bestSplit5v5, computeMmrUpdates, averageMmr } from "@inhouse/core";
import { getServiceClient } from "@/lib/supabase/admin";
import { isStaffGuildMember } from "@/lib/env";
import type { LinkCodeRow, ProfileRow } from "@/lib/database.types";

export type DInteraction = {
  type: number;
  application_id: string;
  token: string;
  member?: { user?: { id: string }; roles?: string[]; permissions?: string } | null;
  user?: { id: string } | null;
  guild_id?: string | null;
  data?: { name?: string; options?: { name: string; value?: string | number; type: number }[] };
  channel_id?: string;
};

function getDiscordUserId(i: DInteraction): string {
  return i.member?.user?.id ?? i.user?.id ?? "";
}

function optionString(data: DInteraction, name: string): string | undefined {
  const o = data.data?.options?.find((x) => x.name === name);
  if (o?.value === undefined) return undefined;
  return String(o.value);
}

export function makeDeferPayload(): { type: number; data: { flags: number } } {
  return { type: 5, data: { flags: 64 } };
}

export async function processApplicationCommand(
  it: DInteraction
): Promise<{ content: string; embeds?: object[] }> {
  if (!it.guild_id) {
    return { content: "Usa estes comandos num servidor, não em DM." };
  }
  const cmd = it.data?.name ?? "";
  const supabase = getServiceClient();
  const guildId = it.guild_id;
  const duid = getDiscordUserId(it);

  switch (cmd) {
    case "vincular": {
      const raw = (optionString(it, "codigo") ?? "").trim().toUpperCase();
      if (!raw) {
        return { content: "Indica o código: `/vincular codigo:ABCD1234` (gerado no site, logado)." };
      }
      const { data: link, error: le } = await supabase
        .from("link_codes")
        .select("id, user_id, expires_at, used_at")
        .eq("code", raw)
        .is("used_at", null)
        .maybeSingle();
      if (le || !link) {
        return { content: "Código inválido, já usado ou expirado. Gera outro no site." };
      }
      const lc = link as LinkCodeRow;
      if (new Date(lc.expires_at) < new Date()) {
        return { content: "Código expirado. Gera outro no site." };
      }
      const { data: other } = await supabase
        .from("profiles")
        .select("id")
        .eq("discord_user_id", duid)
        .maybeSingle();
      if (other) {
        return { content: "Esta conta Discord já está vinculada a um perfil." };
      }
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("id, discord_user_id")
        .eq("id", lc.user_id)
        .maybeSingle();
      const target = targetProfile as { id: string; discord_user_id: string | null } | null;
      if (target?.discord_user_id) {
        return { content: "Esse e-mail do site já vinculou outro Discord." };
      }
      const { error: uperr } = await supabase
        .from("profiles")
        .update({ discord_user_id: duid, updated_at: new Date().toISOString() })
        .eq("id", lc.user_id);
      if (uperr) {
        return { content: "Erro ao vincular. Tenta de novo." };
      }
      await supabase
        .from("link_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", lc.id);
      return { content: "Conta vinculada. Usa `/perfil` e boas partidas." };
    }
    case "perfil": {
      const { data: p, error } = await supabase
        .from("profiles")
        .select("display_name, mmr, wins, losses, games_played, summoner_riot")
        .eq("discord_user_id", duid)
        .maybeSingle();
      if (error || !p) {
        return {
          content:
            "Perfil não encontrado. Cria conta no site (e-mail) e usa `/vincular` com o código do painel.",
        };
      }
      const prof = p as Pick<
        ProfileRow,
        "display_name" | "mmr" | "wins" | "losses" | "games_played" | "summoner_riot"
      >;
      const w = prof.wins ?? 0;
      const l = prof.losses ?? 0;
      const g = w + l;
      const wr = g ? Math.round((w / g) * 100) : 0;
      const name = prof.display_name ?? "—";
      const sum = prof.summoner_riot ? ` · Summoner: ${prof.summoner_riot}` : "";
      return {
        content: `**${name}**${sum}\nMMR: **${Math.round(prof.mmr * 10) / 10}** — ${w}V / ${l}D (${wr}% WR) · Partidas: ${g}`,
      };
    }
    case "entrar": {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("discord_user_id", duid)
        .maybeSingle();
      if (!p) {
        return { content: "Vincula a conta: site + `/vincular`." };
      }
      const { data: inq } = await supabase
        .from("queue_entries")
        .select("id")
        .eq("guild_id", guildId)
        .eq("user_id", p.id)
        .maybeSingle();
      if (inq) {
        return { content: "Já estás na fila." };
      }
      const { count } = await supabase
        .from("queue_entries")
        .select("*", { count: "exact", head: true })
        .eq("guild_id", guildId);
      if ((count ?? 0) >= 10) {
        return { content: "A fila está cheia (10/10). Staff pode usar `/sortear`." };
      }
      const { error } = await supabase
        .from("queue_entries")
        .insert({ guild_id: guildId, user_id: p.id });
      if (error) {
        return { content: "Não foi possível entrar na fila." };
      }
      return { content: "Entraste na fila. Fila: " + ((count ?? 0) + 1) + "/10." };
    }
    case "sair": {
      const { data: p } = await supabase
        .from("profiles")
        .select("id")
        .eq("discord_user_id", duid)
        .maybeSingle();
      if (!p) {
        return { content: "Perfil não encontrado. `/vincular` primeiro." };
      }
      await supabase
        .from("queue_entries")
        .delete()
        .eq("guild_id", guildId)
        .eq("user_id", p.id);
      return { content: "Saíste da fila." };
    }
    case "fila": {
      const { data: rows, error } = await supabase
        .from("queue_entries")
        .select("user_id, joined_at, profiles(display_name, mmr, discord_user_id)")
        .eq("guild_id", guildId)
        .order("joined_at", { ascending: true });
      if (error) {
        return { content: "Erro a ler a fila." };
      }
      if (!rows?.length) {
        return { content: "Fila vazia. Usa `/entrar`." };
      }
      const lines = rows.map((r, i) => {
        const pr = (r as unknown as { profiles: { display_name: string | null; mmr: number; discord_user_id: string | null } | null })
          .profiles;
        const m = pr?.mmr != null ? Math.round(pr.mmr) : "-";
        const n = pr?.display_name?.trim() ||
          (pr?.discord_user_id ? `${pr.discord_user_id.slice(0, 6)}…` : "—");
        return `${i + 1}. ${n} (${m})`;
      });
      return { content: `**Fila ${rows.length}/10**\n` + lines.join("\n") };
    }
    case "sortear": {
      if (!isStaffGuildMember(it.member?.roles)) {
        return {
          content:
            "Apenas staff (cargo configurado) pode sortear. Define `DISCORD_STAFF_ROLE_IDS` se ainda não existir; vazio = todos (dev).",
        };
      }
      const { data: qrows, error: qe } = await supabase
        .from("queue_entries")
        .select("user_id, profiles(id, display_name, mmr, games_played, discord_user_id)")
        .eq("guild_id", guildId)
        .order("joined_at", { ascending: true });
      if (qe) {
        return { content: "Erro a ler a fila." };
      }
      if (!qrows || qrows.length !== 10) {
        return { content: "São necessários 10 na fila. Atual: " + (qrows?.length ?? 0) + "/10." };
      }
      const players = qrows.map((row) => {
        const pr = (row as unknown as { profiles: { id: string; display_name: string | null; mmr: number; games_played: number; discord_user_id: string | null } | null })
          .profiles;
        if (!pr?.id) {
          return null;
        }
        return {
          id: pr.id,
          mmr: Number(pr.mmr),
          name: pr.display_name?.trim() || pr.discord_user_id || "—",
        };
      });
      if (players.some((p) => p == null)) {
        return { content: "Dados de jogador inválidos na fila." };
      }
      const clean = players as { id: string; mmr: number; name: string }[];
      const { teamA, teamB, diff } = bestSplit5v5(
        clean.map((p) => ({ id: p.id, mmr: p.mmr }))
      );
      const avgA = averageMmr(teamA);
      const avgB = averageMmr(teamB);
      const byId = new Map(clean.map((c) => [c.id, c]));
      const matchId = crypto.randomUUID();
      const { error: me } = await supabase.from("matches").insert({
        id: matchId,
        guild_id: guildId,
        status: "pending",
        team_a_mmr_mean: avgA,
        team_b_mmr_mean: avgB,
        k_factor: 24,
        created_by_discord_user_id: duid,
      });
      if (me) {
        return { content: "Erro ao criar a partida: " + me.message };
      }
      const partRows: { match_id: string; user_id: string; team: "A" | "B"; mmr_before: number }[] = [];
      for (const p of teamA) {
        const mmr = byId.get(p.id)?.mmr ?? p.mmr;
        partRows.push({ match_id: matchId, user_id: p.id, team: "A", mmr_before: mmr });
      }
      for (const p of teamB) {
        const mmr = byId.get(p.id)?.mmr ?? p.mmr;
        partRows.push({ match_id: matchId, user_id: p.id, team: "B", mmr_before: mmr });
      }
      const { error: pe } = await supabase.from("match_participants").insert(partRows);
      if (pe) {
        await supabase.from("matches").delete().eq("id", matchId);
        return { content: "Erro ao gravar participantes. Tenta de novo." };
      }
      await supabase.from("queue_entries").delete().eq("guild_id", guildId);
      const listTeam = (t: { id: string; mmr: number }[], label: string, avg: number) => {
        const ppl = t.map((x) => `• ${byId.get(x.id)?.name ?? "?"} (${Math.round(x.mmr)})`);
        return `**${label}** (média **${(Math.round(avg * 10) / 10).toFixed(1)}**)\n` + ppl.join("\n");
      };
      const diffTxt = (Math.round(diff * 10) / 10).toFixed(1);
      return {
        content:
          `Partida \`${matchId}\` **pendente**.\n` +
          `Diferença de média (antes do jogo): **${diffTxt}** MMR.\n\n` +
          listTeam(teamA, "Time A", avgA) +
          "\n\n" +
          listTeam(teamB, "Time B", avgB) +
          `\n\nApós a custom, staff: \`/resultado vencedor:A\` ou \`vencedor:B\` (última partida pendente deste servidor).`,
      };
    }
    case "resultado": {
      if (!isStaffGuildMember(it.member?.roles)) {
        return { content: "Apenas staff pode registar o resultado. Define `DISCORD_STAFF_ROLE_IDS`." };
      }
      const vOpt = (optionString(it, "vencedor") ?? "A").toUpperCase();
      const winner: "A" | "B" = vOpt === "B" || vOpt === "TIME_B" ? "B" : "A";
      const { data: m, error: mErr } = await supabase
        .from("matches")
        .select("id, status, guild_id")
        .eq("guild_id", guildId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (mErr) {
        return { content: "Erro a obter a partida." };
      }
      if (!m) {
        return { content: "Não há partida pendente para este servidor." };
      }
      const { data: parts, error: pe } = await supabase
        .from("match_participants")
        .select("user_id, team, mmr_before")
        .eq("match_id", m.id);
      if (pe || !parts?.length) {
        return { content: "Participantes em falta." };
      }
      const userIds = [...new Set(parts.map((p) => p.user_id))];
      const { data: profs, error: pre } = await supabase
        .from("profiles")
        .select("id, mmr, games_played, wins, losses, discord_user_id")
        .in("id", userIds);
      if (pre || !profs?.length) {
        return { content: "Erro a carregar perfis." };
      }
      const pmap = new Map(profs.map((p) => [p.id, p]));
      const teamA: { id: string; mmr: number; gamesPlayed: number }[] = [];
      const teamB: { id: string; mmr: number; gamesPlayed: number }[] = [];
      for (const row of parts) {
        const p = pmap.get(row.user_id);
        if (!p) continue;
        const rp = { id: row.user_id, mmr: row.mmr_before, gamesPlayed: p.games_played };
        if (row.team === "A") {
          teamA.push(rp);
        } else {
          teamB.push(rp);
        }
      }
      const mmrUpdates = computeMmrUpdates(teamA, teamB, winner);
      const umap = new Map(mmrUpdates.map((u) => [u.userId, u]));
      for (const p of profs) {
        const u = umap.get(p.id);
        if (!u) continue;
        const won = teamA.some((t) => t.id === p.id) ? winner === "A" : winner === "B";
        const lost = !won;
        await supabase
          .from("profiles")
          .update({
            mmr: u.mmrAfter,
            games_played: (p.games_played ?? 0) + 1,
            wins: (p.wins ?? 0) + (won ? 1 : 0),
            losses: (p.losses ?? 0) + (lost ? 1 : 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        await supabase
          .from("match_participants")
          .update({ mmr_delta: u.delta })
          .eq("match_id", m.id)
          .eq("user_id", p.id);
      }
      await supabase
        .from("matches")
        .update({
          status: "completed",
          winner: winner,
          completed_at: new Date().toISOString(),
        })
        .eq("id", m.id);
      const dby = new Map(profs.map((x) => [x.id, x.discord_user_id]));
      const outLines = mmrUpdates.map((r) => {
        const d = dby.get(r.userId);
        const who = d ? `<@${d}>` : `${r.userId.slice(0, 8)}…`;
        const sign = r.delta >= 0 ? "+" : "";
        return `• ${who} ${sign}${r.delta} → **${(Math.round(r.mmrAfter * 10) / 10).toFixed(1)}**`;
      });
      return {
        content:
          `Partida \`${m.id}\` concluída. Vencedor: **Time ${winner}**.\n` +
          outLines.join("\n"),
      };
    }
    case "ranking": {
      const { data: top, error } = await supabase
        .from("profiles")
        .select("display_name, mmr, wins, losses, discord_user_id")
        .order("mmr", { ascending: false })
        .limit(20);
      if (error) {
        return { content: "Erro a carregar o ranking." };
      }
      if (!top?.length) {
        return { content: "Sem dados ainda." };
      }
      const lines = top.map((p, i) => {
        const w = p.wins ?? 0;
        const l = p.losses ?? 0;
        return `${i + 1}. ${p.display_name ?? p.discord_user_id ?? "?"} — **${(Math.round((p as { mmr: number }).mmr * 10) / 10).toFixed(1)}** (${w}V/${l}D)`;
      });
      return { content: "**Top 20 (MMR)**\n" + lines.join("\n") };
    }
    default:
      return { content: "Comando desconhecido." };
  }
}
