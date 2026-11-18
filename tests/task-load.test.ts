import { describe, expect, it } from "vitest";
import { starsForCompletedOccurrence } from "@/lib/task-load";

describe("stars for completed occurrences", () => {
  it("uses effort as the base for a single occurrence", () => {
    expect(starsForCompletedOccurrence(3, 1)).toBe(3);
  });

  it("accounts for the number of required completions in a weekly target", () => {
    expect(starsForCompletedOccurrence(2, 3)).toBe(6);
  });
});
