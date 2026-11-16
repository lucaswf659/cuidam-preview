import { describe, expect, it } from "vitest";
import { onboardingPayloadSchema } from "@/lib/real/onboarding-schema";

describe("onboarding payload", () => {
  it("aceita payload válido", () => {
    expect(onboardingPayloadSchema.safeParse({ name: "Ana", houseName: "Nossa casa", areas: [], tasks: [] }).success).toBe(true);
  });

  it("rejeita nome vazio e mais de 20 áreas", () => {
    expect(onboardingPayloadSchema.safeParse({ name: " ", houseName: "Casa", areas: [], tasks: [] }).success).toBe(false);
    const areas = Array.from({ length: 21 }, (_, index) => ({ id: String(index), name: "Área", icon: "⌂" }));
    expect(onboardingPayloadSchema.safeParse({ name: "Ana", houseName: "Casa", areas, tasks: [] }).success).toBe(false);
  });

  it("rejeita uma tarefa ligada a uma área não selecionada", () => {
    expect(onboardingPayloadSchema.safeParse({ name: "Ana", houseName: "Casa", areas: [], tasks: [{ areaId: "kitchen", name: "Limpar bancada", responsibility: "Você", recurrence: "Diária", load: 2 }] }).success).toBe(false);
  });
});
