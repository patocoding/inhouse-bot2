import { averageMmr } from "./mmr.js";

export type PlayerForBalance = { id: string; mmr: number };

/**
 * C(9,4) = 126 partições únicas: jogador 0 fica no time A; evita dobrar (A|B) vs (B|A).
 * Escolhe a divisão com menor |média_A - média_B|; desempate lex nos índices (1..9) do time A.
 */
export function bestSplit5v5(players: PlayerForBalance[]): {
  teamA: PlayerForBalance[];
  teamB: PlayerForBalance[];
  diff: number;
} {
  if (players.length !== 10) {
    throw new Error("São necessários exatamente 10 jogadores.");
  }
  const byId = new Map(players.map((p) => [p.id, p]));
  if (byId.size !== 10) {
    throw new Error("IDs de jogador devem ser únicos.");
  }

  const list = players.slice();
  if (list[0] == null) {
    throw new Error("Dados de jogador inválidos.");
  }

  let best: { four: number[]; diff: number } | null = null;

  for (const four of combinations4of9(9)) {
    const idxA = [0, ...four.map((i) => i + 1)];
    const setA = new Set(idxA);
    const teamA = list.filter((_, i) => setA.has(i));
    const teamB = list.filter((_, i) => !setA.has(i));
    const d = Math.abs(averageMmr(teamA) - averageMmr(teamB));
    if (!best || d < best.diff - 1e-9 || (Math.abs(d - best.diff) < 1e-9 && lexLess(four, best.four))) {
      best = { four, diff: d };
    }
  }

  if (!best) {
    throw new Error("Falha ao sortear times.");
  }
  const setA = new Set([0, ...best.four.map((i) => i + 1)]);
  const teamA = list.filter((_, i) => setA.has(i));
  const teamB = list.filter((_, i) => !setA.has(i));
  return { teamA, teamB, diff: best.diff };
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return (a[i] ?? 0) < (b[i] ?? 0);
  }
  return a.length < b.length;
}

/** C(n,4) com índices 0..n-1, cada combinação ordenada. */
function combinations4of9(n: number): number[][] {
  if (n < 4) return [];
  const out: number[][] = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      for (let c = b + 1; c < n; c++) {
        for (let d = c + 1; d < n; d++) {
          out.push([a, b, c, d]);
        }
      }
    }
  }
  return out;
}
