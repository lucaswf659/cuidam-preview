import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn(), refresh: vi.fn() },
  resetPasswordForEmail: vi.fn(),
  getSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/supabase/browser", () => ({
  createClient: () => ({ auth: {
    resetPasswordForEmail: mocks.resetPasswordForEmail,
    getSession: mocks.getSession,
    updateUser: mocks.updateUser,
  } }),
}));

import { OnboardingFlow } from "@/components/onboarding-flow";
import { ResetPasswordForm } from "@/components/reset-password-form";

describe("recuperação de senha", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_CUIDAM_MOCK", "false");
    mocks.router.replace.mockClear();
    mocks.router.refresh.mockClear();
    mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    mocks.updateUser.mockReset().mockResolvedValue({ error: null });
  });

  it("pede redefinição pelo Supabase e mostra uma confirmação que não revela se a conta existe", async () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Já tenho uma conta" }));
    fireEvent.click(screen.getByRole("button", { name: "Esqueci minha senha" }));
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "pessoa@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar instruções" }));

    await waitFor(() => expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("pessoa@example.com", {
      redirectTo: `${window.location.origin}/auth/confirm`,
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Se houver uma conta associada");
  });

  it("só troca a senha quando as duas entradas coincidem e então segue para Hoje", async () => {
    render(<ResetPasswordForm />);
    await screen.findByRole("heading", { name: "Escolha uma nova senha." });
    fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: "senha-nova-123" } });
    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "outra-senha" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("As senhas não coincidem.");
    expect(mocks.updateUser).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Confirme a nova senha"), { target: { value: "senha-nova-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "senha-nova-123" }));
    expect(mocks.router.replace).toHaveBeenCalledWith("/today");
    expect(mocks.router.refresh).toHaveBeenCalled();
  });
});

