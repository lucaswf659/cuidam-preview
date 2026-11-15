import type { NotificationPreferences } from "@/lib/mock/store";

export const defaultNotificationPreferences: NotificationPreferences = {
  morningReminder: true,
  activity: false,
  sharedTask: false,
  quietStart: "22:00",
  quietEnd: "08:00"
};

export function isValidQuietTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isQuietTime(now: string, quietStart: string, quietEnd: string): boolean {
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const current = minutes(now);
  const start = minutes(quietStart);
  const end = minutes(quietEnd);
  if (start === end) return false;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export function canSendGroupedReminder(preferences: NotificationPreferences, now: string) {
  return preferences.morningReminder && !isQuietTime(now, preferences.quietStart, preferences.quietEnd);
}
