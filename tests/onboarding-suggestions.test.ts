import { describe, expect, it } from "vitest";
import { defaultOnboardingTaskKeys, onboardingSuggestionsForAreas, suggestedTasksByArea } from "@/lib/onboarding-suggestions";

describe("onboarding task suggestions", () => {
  it("offers at least four prepared options for every home area", () => {
    for (const [areaId, tasks] of Object.entries(suggestedTasksByArea)) {
      expect(tasks.length, areaId).toBeGreaterThanOrEqual(4);
      expect(tasks.every((task) => task.load >= 1 && task.load <= 5), areaId).toBe(true);
    }
  });

  it("keeps the starter set selected and leaves extra suggestions optional", () => {
    const tasks = onboardingSuggestionsForAreas(["kitchen", "pets"]);
    const selected = defaultOnboardingTaskKeys(tasks);

    expect(selected.size).toBe(5);
    expect(selected.has("kitchen-0")).toBe(true);
    expect(selected.has("kitchen-3")).toBe(false);
    expect(selected.has("pets-2")).toBe(false);
  });
});
