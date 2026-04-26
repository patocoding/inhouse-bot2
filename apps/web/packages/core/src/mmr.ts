/**
 * MMR estilo Elo para times 5v5: média de MMR de cada time define o esperado;
 * cada jogador recebe delta = K * (S - E_time) com E do time a que pertence.
 * @see docs/mmr-elo.md
 */
export const DEFAULT_MMR = 1500;
export const BASE_K = 24;
export const PROVISIONAL_GAMES = 20;
export const PROVISIONAL_K = 40;

export function kFactorForPlayer(gamesPlayed: number): number {
  return gamesPlayed < PROVISIONAL_GAMES ? PROVISIONAL_K : BASE_K;
}

/** Escore esperado do time A (0–1) a partir das médias de rating. */
export function teamExpectedA(teamARating: number, teamBRating: number): number {
  return 1 / (1 + Math.pow(10, (teamBRating - teamARating) / 400));
}

export function averageMmr(players: { mmr: number }[]): number {
  if (players.length === 0) return DEFAULT_MMR;
  return players.reduce((s, p) => s + p.mmr, 0) / players.length;
}

export type RatedPlayer = {
  id: string;
  mmr: number;
  gamesPlayed: number;
};

export type MmrUpdate = {
  userId: string;
  mmrBefore: number;
  delta: number;
  mmrAfter: number;
  k: number;
};

/**
 * Partida completada. `winner` = time vencedor.
 * Para cada jogador, K individual; E do time = esperado a partir das médias.
 */
export function computeMmrUpdates(
  teamA: RatedPlayer[],
  teamB: RatedPlayer[],
  winner: "A" | "B"
): MmrUpdate[] {
  if (teamA.length === 0 || teamB.length === 0) {
    throw new Error("Ambos os times precisam ter jogadores.");
  }
  const avgA = averageMmr(teamA);
  const avgB = averageMmr(teamB);
  const ea = teamExpectedA(avgA, avgB);
  const eb = 1 - ea;

  const out: MmrUpdate[] = [];

  for (const p of teamA) {
    const k = kFactorForPlayer(p.gamesPlayed);
    const s = winner === "A" ? 1 : 0;
    const e = ea;
    const delta = k * (s - e);
    out.push({
      userId: p.id,
      mmrBefore: p.mmr,
      delta: Math.round(delta * 100) / 100,
      mmrAfter: Math.round((p.mmr + delta) * 100) / 100,
      k,
    });
  }
  for (const p of teamB) {
    const k = kFactorForPlayer(p.gamesPlayed);
    const s = winner === "B" ? 1 : 0;
    const e = eb;
    const delta = k * (s - e);
    out.push({
      userId: p.id,
      mmrBefore: p.mmr,
      delta: Math.round(delta * 100) / 100,
      mmrAfter: Math.round((p.mmr + delta) * 100) / 100,
      k,
    });
  }

  return out;
}
