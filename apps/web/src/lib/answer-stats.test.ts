import { describe, expect, it } from "vitest";
import { buildChoiceStats } from "./answer-stats";

describe("buildChoiceStats", () => {
  it("returns zeroed stats when there are no answers", () => {
    const { choiceStats, totalAnswered } = buildChoiceStats(
      [{ id: "a" }, { id: "b" }],
      new Map(),
    );

    expect(totalAnswered).toBe(0);
    expect(choiceStats).toEqual({
      a: { count: 0, percent: 0 },
      b: { count: 0, percent: 0 },
    });
  });

  it("counts answers and calculates rounded percentages", () => {
    const answers = new Map<string, string[]>([
      ["p1", ["a"]],
      ["p2", ["b"]],
      ["p3", ["b"]],
    ]);

    const { choiceStats, totalAnswered } = buildChoiceStats(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      answers,
    );

    expect(totalAnswered).toBe(3);
    expect(choiceStats).toEqual({
      a: { count: 1, percent: 33 },
      b: { count: 2, percent: 67 },
      c: { count: 0, percent: 0 },
    });
  });

  it("ignores unknown and empty submitted answers", () => {
    const answers = new Map<string, string[]>([
      ["p1", ["a"]],
      ["p2", ["z"]],
      ["p3", []],
    ]);

    const { choiceStats, totalAnswered } = buildChoiceStats(
      [{ id: "a" }, { id: "b" }],
      answers,
    );

    expect(totalAnswered).toBe(1);
    expect(choiceStats).toEqual({
      a: { count: 1, percent: 100 },
      b: { count: 0, percent: 0 },
    });
  });
});
