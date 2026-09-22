import { describe, expect, it } from "vitest";
import { onboardingPayloadSchema } from "@/app/api/onboarding/route";

describe("onboarding payload", () => {
  it("aceita payload válido", () => {
    expect(onboardingPayloadSchema.safeParse({ name: "Ana", houseName: "Nossa casa", areas: [] }).success).toBe(true);
  });

  it("rejeita nome vazio e mais de 20 áreas", () => {
    expect(onboardingPayloadSchema.safeParse({ name: " ", houseName: "Casa", areas: [] }).success).toBe(false);
    const areas = Array.from({ length: 21 }, (_, index) => ({ id: String(index), name: "Área", icon: "⌂" }));
    expect(onboardingPayloadSchema.safeParse({ name: "Ana", houseName: "Casa", areas }).success).toBe(false);
  });
});
