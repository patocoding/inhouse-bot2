import { describe, expect, it } from "vitest";
import { averageMmr, computeMmrUpdates, kFactorForPlayer, teamExpectedA } from "./mmr.js";

describe("kFactorForPlayer", () => {
  it("K maior enquanto provisório", () => {
    expect(kFactorForPlayer(0)).toBe(40);
    expect(kFactorForPlayer(19)).toBe(40);
    expect(kFactorForPlayer(20)).toBe(24);
  });
});

describe("teamExpectedA", () => {
  it("empate quando médias iguais", () => {
    expect(teamExpectedA(1500, 1500)).toBeCloseTo(0.5, 5);
  });
});

describe("computeMmrUpdates", () => {
  it("time favorito A vence: todos em A ganham rating esperado positivo", () => {
    const teamA = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      mmr: 1600,
      gamesPlayed: 30,
    }));
    const teamB = Array.from({ length: 5 }, (_, i) => ({
      id: `b${i}`,
      mmr: 1400,
      gamesPlayed: 30,
    }));
    const u = computeMmrUpdates(teamA, teamB, "A");
    expect(u).toHaveLength(10);
    for (const row of u.filter((x) => x.userId.startsWith("a"))) {
      expect(row.delta).toBeGreaterThan(0);
    }
    for (const row of u.filter((x) => x.userId.startsWith("b"))) {
      expect(row.delta).toBeLessThan(0);
    }
  });
});

describe("averageMmr", () => {
  it("média simples", () => {
    expect(
      averageMmr([
        { mmr: 1000 },
        { mmr: 2000 },
      ])
    ).toBe(1500);
  });
});
