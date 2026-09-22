import { describe, expect, it } from "vitest";
import { currentPeriodKey, periodKeyForRecurrence } from "@/lib/real/recurrence";

const anchor = new Date("2026-09-21T12:00:00.000Z");

describe("recorrência", () => {
  it("calcula o período diário no fuso da casa", () => {
    expect(currentPeriodKey(new Date("2026-09-22T02:30:00.000Z"), "America/Sao_Paulo")).toBe("2026-09-21");
    expect(periodKeyForRecurrence({ recurrenceKind: "DAILY", recurrenceInterval: 1, weeklyTarget: 1, recurrenceAnchor: anchor }, anchor)).toBe("2026-09-21");
  });

  it("mantém uma ocorrência única para a semana e o mês", () => {
    expect(periodKeyForRecurrence({ recurrenceKind: "WEEKLY", recurrenceInterval: 1, weeklyTarget: 3, recurrenceAnchor: anchor }, new Date("2026-09-23T12:00:00.000Z"))).toBe("week:2026-09-21");
    expect(periodKeyForRecurrence({ recurrenceKind: "MONTHLY", recurrenceInterval: 1, weeklyTarget: 1, recurrenceAnchor: anchor }, new Date("2026-09-30T12:00:00.000Z"))).toBe("month:2026-09");
  });

  it("respeita a âncora de recorrências a cada N semanas", () => {
    const recurrence = { recurrenceKind: "EVERY_N_WEEKS", recurrenceInterval: 2, weeklyTarget: 1, recurrenceAnchor: anchor };
    expect(periodKeyForRecurrence(recurrence, new Date("2026-09-28T12:00:00.000Z"))).toBeNull();
    expect(periodKeyForRecurrence(recurrence, new Date("2026-10-05T12:00:00.000Z"))).toBe("week:2026-09-21:1");
  });
});

