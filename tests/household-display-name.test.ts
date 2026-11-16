import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  findUser: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUser, update: mocks.updateUser } } }));
vi.mock("@/lib/real/occurrences", () => ({ ensureCurrentOccurrences: vi.fn() }));

import { getRealContext } from "@/lib/real/household";

describe("getRealContext display name sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1", email: "lucaswf659@gmail.com", user_metadata: { display_name: "Lucas WF" } } } }) }
    });
    mocks.findUser.mockResolvedValue({
      id: "user-1",
      name: "lucaswf659",
      activeHouseholdId: "house-1",
      activeHousehold: { id: "house-1" },
      memberships: [{ householdId: "house-1", id: "membership-1" }]
    });
    mocks.updateUser.mockResolvedValue({});
  });

  it("syncs the explicit Supabase display name to the app profile", async () => {
    const context = await getRealContext();

    expect(mocks.updateUser).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { name: "Lucas WF" } });
    expect(context?.dbUser.name).toBe("Lucas WF");
  });

  it("does not replace the app name with an email prefix when metadata is empty", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "auth-1", email: "lucaswf659@gmail.com", user_metadata: {} } } }) }
    });

    const context = await getRealContext();

    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(context?.dbUser.name).toBe("lucaswf659");
  });
});

