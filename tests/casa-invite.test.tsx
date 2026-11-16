import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CasaMock } from "@/components/casa-mock";

const household = {
  id: "household-test",
  name: "Nossa casa de teste",
  ownerName: "Pessoa de teste",
  ownerEmail: "teste@example.com",
  memberCount: 1,
  areas: [],
  tasks: [],
  members: [{ id: "member-test", name: "Pessoa de teste", current: true }]
};

describe("CasaMock invitation link", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the generated link and says no email was sent", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ created: true, inviteUrl: "/convite/token-de-teste" })
    }));
    render(<CasaMock household={household} />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "convidado@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerar link/ }));

    expect(await screen.findByRole("textbox", { name: "Link do convite" })).toHaveValue("http://localhost:3000/convite/token-de-teste");
    expect(screen.getByText("Link de demonstração pronto. Nenhum e-mail foi enviado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar link" })).toBeInTheDocument();
  });

  it("copies the invitation link and confirms the copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ created: true, inviteUrl: "/convite/token-de-teste" })
    }));
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CasaMock household={household} />);

    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "convidado@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Gerar link/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Copiar link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("http://localhost:3000/convite/token-de-teste"));
    expect(await screen.findByText("Link copiado.")).toBeInTheDocument();
  });

  it("shows household members and a pending invitation together", () => {
    render(<CasaMock household={{
      ...household,
      memberCount: 2,
      members: [
        { id: "member-1", name: "Pessoa de teste", current: true },
        { id: "member-2", name: "Outra pessoa" }
      ],
      invitations: [{ id: "invite-1", email: "outra@example.com", expiresAt: "2026-11-20T12:00:00.000Z" }]
    }} />);

    expect(screen.getByRole("heading", { name: "Pessoas" })).toBeInTheDocument();
    expect(screen.getByText("Outra pessoa")).toBeInTheDocument();
    expect(screen.getByText("outra@example.com")).toBeInTheDocument();
    expect(screen.getByText("Convite aguardando resposta")).toBeInTheDocument();
    expect(screen.getByText("Esta casa já tem as duas pessoas previstas no MVP.")).toBeInTheDocument();
  });

  it("explains the effect of archiving an area and keeps it reversible until confirmed", () => {
    render(<CasaMock household={{
      ...household,
      areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }]
    }} />);

    fireEvent.click(screen.getByRole("button", { name: /Cozinha/ }));
    fireEvent.click(screen.getByRole("button", { name: "Arquivar área" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("As tarefas ativas dessa área também saem da rotina.");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });
});

