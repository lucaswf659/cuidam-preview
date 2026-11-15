import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
}));

describe("POST /api/auth/confirm-recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.verifyOtp.mockReset();
  });

  it("verifies a recovery token hash on the server", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const { POST } = await import("@/app/api/auth/confirm-recovery/route");

    const response = await POST(new Request("https://cuidam-preview.vercel.app/api/auth/confirm-recovery", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenHash: "recovery-token-hash" }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "recovery-token-hash", type: "recovery" });
  });

  it("rejects a missing token without calling Supabase", async () => {
    const { POST } = await import("@/app/api/auth/confirm-recovery/route");
    const response = await POST(new Request("https://cuidam-preview.vercel.app/api/auth/confirm-recovery", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}),
    }));

    expect(response.status).toBe(400);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("returns a recoverable message when Supabase rejects an expired token", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: new Error("expired") });
    const { POST } = await import("@/app/api/auth/confirm-recovery/route");
    const response = await POST(new Request("https://cuidam-preview.vercel.app/api/auth/confirm-recovery", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tokenHash: "expired-token" }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Este link expirou ou já foi usado. Peça uma nova mensagem." });
  });
});

