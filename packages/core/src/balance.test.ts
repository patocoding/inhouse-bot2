import { describe, expect, it } from "vitest";
import { bestSplit5v5 } from "./balance.js";

describe("bestSplit5v5", () => {
  it("separa altos e baixos de forma a minimizar diferença de média", () => {
    const mmrs = [2000, 1900, 1800, 1700, 1600, 1100, 1000, 900, 800, 700];
    const players = mmrs.map((m, i) => ({ id: `p${i}`, mmr: m }));
    const { teamA, teamB, diff } = bestSplit5v5(players);
    const sum = (t: { mmr: number }[]) => t.reduce((s, p) => s + p.mmr, 0);
    const all = new Set(players.map((p) => p.id));
    const inTeams = new Set([...teamA, ...teamB].map((p) => p.id));
    expect(inTeams.size).toBe(10);
    for (const id of inTeams) all.delete(id);
    expect(all.size).toBe(0);
    expect(Math.abs(sum(teamA) / 5 - sum(teamB) / 5)).toBeCloseTo(diff, 3);
  });

  it("falha com != 10 jogadores", () => {
    expect(() => bestSplit5v5([{ id: "a", mmr: 1 }])).toThrow();
  });
});
