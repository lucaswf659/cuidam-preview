import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchangeCodeForSession } }),
}));

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  });

  it("troca o código e segue para a página de nova senha", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("https://cuidam-preview.vercel.app/auth/callback?code=pkce-code&next=%2Fauth%2Freset-password"));

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(response.headers.get("location")).toBe("https://cuidam-preview.vercel.app/auth/reset-password");
  });

  it("bloqueia destinos externos no parâmetro next", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    const response = await GET(new Request("https://cuidam-preview.vercel.app/auth/callback?code=pkce-code&next=%2F%2Fevil.example"));

    expect(response.headers.get("location")).toBe("https://cuidam-preview.vercel.app/");
  });
});

