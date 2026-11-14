import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
const mocks = vi.hoisted(() => ({ router: { push: vi.fn(), replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams()
}));

import { OnboardingFlow } from "@/components/onboarding-flow";

describe("OnboardingFlow", () => {
  it("exibe a entrada principal e permite iniciar cadastro", () => {
    render(<OnboardingFlow />);
    expect(screen.getByRole("heading", { name: "Cada um cuida do que é seu." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByRole("heading", { name: "Vamos deixar isso fácil." })).toBeInTheDocument();
    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
  });

  it("separa o caminho de login do cadastro", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Já tenho uma conta" }));
    expect(screen.getByRole("heading", { name: "Que bom ter você de volta." })).toBeInTheDocument();
    expect(screen.queryByLabelText("Seu nome")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
  it("leva direto para Hoje no login quando a conta já tem casa", async () => {
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "true");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ household: { id: "house-1", name: "Nossa casa" } }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Já tenho uma conta" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "convidado@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "senha-teste-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/today"));
    expect(screen.queryByRole("heading", { name: /Bem-vindo à/ })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

});
