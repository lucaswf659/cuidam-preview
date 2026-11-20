import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), getUser: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { getAuthenticatedUser } from "@/lib/real/household";

describe("Supabase server authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1", email: "lucas@example.com" } }, error: null });
  });

  it("validates a native bearer token with Supabase Auth", async () => {
    const request = new Request("https://cuidam-preview.vercel.app/api/tasks", {
      headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature" },
    });

    const user = await getAuthenticatedUser(request);

    expect(user).toMatchObject({ id: "auth-user-1" });
    expect(mocks.getUser).toHaveBeenCalledWith("eyJhbGciOiJIUzI1NiJ9.payload.signature");
  });

  it("rejects a malformed authorization header without falling back to cookies", async () => {
    const request = new Request("https://cuidam-preview.vercel.app/api/tasks", {
      headers: { authorization: "Basic invalid" },
    });

    await expect(getAuthenticatedUser(request)).resolves.toBeNull();
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("keeps cookie-based web authentication when there is no authorization header", async () => {
    const request = new Request("https://cuidam-preview.vercel.app/api/tasks");

    const user = await getAuthenticatedUser(request);

    expect(user).toMatchObject({ id: "auth-user-1" });
    expect(mocks.getUser).toHaveBeenCalledWith();
  });
});
