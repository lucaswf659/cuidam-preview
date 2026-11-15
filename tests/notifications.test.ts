import { describe, expect, it } from "vitest";
import { canSendGroupedReminder, isQuietTime, isValidQuietTime } from "@/lib/real/notifications";
import { defaultNotificationPreferences } from "@/lib/mock/store";

describe("quiet hours and reminder eligibility", () => {
  it("supports quiet hours that cross midnight, including the start but not the end", () => {
    expect(isQuietTime("22:00", "22:00", "08:00")).toBe(true);
    expect(isQuietTime("07:59", "22:00", "08:00")).toBe(true);
    expect(isQuietTime("08:00", "22:00", "08:00")).toBe(false);
    expect(isQuietTime("12:00", "22:00", "08:00")).toBe(false);
  });

  it("sends at most the eligible grouped reminder when enabled and outside quiet hours", () => {
    expect(canSendGroupedReminder(defaultNotificationPreferences, "08:00")).toBe(true);
    expect(canSendGroupedReminder(defaultNotificationPreferences, "07:30")).toBe(false);
    expect(canSendGroupedReminder({ ...defaultNotificationPreferences, morningReminder: false }, "09:00")).toBe(false);
  });

  it("validates 24-hour quiet time values", () => {
    expect(isValidQuietTime("23:59")).toBe(true);
    expect(isValidQuietTime("24:00")).toBe(false);
    expect(isValidQuietTime("8:00")).toBe(false);
  });
});
