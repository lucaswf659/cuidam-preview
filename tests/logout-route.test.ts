import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookieSet: vi.fn(),
  signOut: vi.fn()
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet })
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } })
}));

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("clears the demo session cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "true");
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.cookieSet).toHaveBeenCalledWith("cuidam_mock_session", "", expect.objectContaining({ maxAge: 0, path: "/" }));
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("signs out of Supabase", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "false");
    mocks.signOut.mockResolvedValue({ error: null });
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("returns an error when Supabase sign-out fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "false");
    mocks.signOut.mockResolvedValue({ error: new Error("sign-out failed") });
    const { POST } = await import("@/app/api/auth/logout/route");

    const response = await POST();

    expect(response.status).toBe(500);
  });
});

