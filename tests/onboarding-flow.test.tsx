import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
