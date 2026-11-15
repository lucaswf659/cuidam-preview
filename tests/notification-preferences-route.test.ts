import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: { notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() } },
  getRealContext: vi.fn(),
  cookies: vi.fn(async () => ({ get: () => ({ value: "mock-morador.teste%40cuidam.dev" }) }))
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/real/household", () => ({ getRealContext: mocks.getRealContext }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));

describe("/api/notification-preferences", () => {
  let GET: typeof import("@/app/api/notification-preferences/route").GET;
  let PATCH: typeof import("@/app/api/notification-preferences/route").PATCH;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "false");
    mocks.getRealContext.mockResolvedValue({ membership: { id: "member-1" } });
    mocks.prisma.notificationPreference.findUnique.mockResolvedValue(null);
    mocks.prisma.notificationPreference.upsert.mockImplementation(async ({ create }) => ({ id: "pref-1", ...create }));
    vi.resetModules();
    ({ GET, PATCH } = await import("@/app/api/notification-preferences/route"));
  });

  it("returns safe defaults scoped to the current household membership", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ preferences: { morningReminder: true, activity: false, sharedTask: false, quietStart: "22:00", quietEnd: "08:00" } });
    expect(mocks.prisma.notificationPreference.findUnique).toHaveBeenCalledWith({ where: { membershipId: "member-1" } });
  });

  it("saves a member's preferences to that active membership", async () => {
    const response = await PATCH(new Request("http://localhost/api/notification-preferences", { method: "PATCH", body: JSON.stringify({ morningReminder: false, activity: true, sharedTask: true, quietStart: "21:30", quietEnd: "07:30" }) }));
    expect(response.status).toBe(200);
    expect(mocks.prisma.notificationPreference.upsert).toHaveBeenCalledWith({ where: { membershipId: "member-1" }, create: { membershipId: "member-1", morningReminder: false, activity: true, sharedTask: true, quietStart: "21:30", quietEnd: "07:30" }, update: { morningReminder: false, activity: true, sharedTask: true, quietStart: "21:30", quietEnd: "07:30" } });
  });

  it("rejects invalid or identical quiet times", async () => {
    const response = await PATCH(new Request("http://localhost/api/notification-preferences", { method: "PATCH", body: JSON.stringify({ morningReminder: true, activity: false, sharedTask: false, quietStart: "22:00", quietEnd: "22:00" }) }));
    expect(response.status).toBe(400);
    expect(mocks.prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });

  it("requires an authenticated household membership", async () => {
    mocks.getRealContext.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.prisma.notificationPreference.findUnique).not.toHaveBeenCalled();
  });
});
