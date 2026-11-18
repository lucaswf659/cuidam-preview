import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("keeps notification settings out of the web house configuration", () => {
    render(<CasaMock household={household} />);

    expect(screen.queryByRole("heading", { name: "Notificações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Configurar" })).not.toBeInTheDocument();
  });

  it("explains the effect of deleting an area and requires confirmation", () => {
    render(<CasaMock household={{
      ...household,
      areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }]
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Gerenciar Cozinha" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir área" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("A área e as tarefas ativas dela saem da rotina.");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("O histórico continua guardado.");
    expect(screen.queryByRole("button", { name: /Mover .* para/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("offers a visual icon picker for a custom area", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ area: { id: "balcony", name: "Varanda", icon: "🪴", sortOrder: 1 } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CasaMock household={household} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar área" }));
    expect(screen.getByRole("group", { name: "Ícone da área" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Ícone")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da área"), { target: { value: "Varanda" } });
    fireEvent.click(screen.getByRole("button", { name: "Plantas" }));
    expect(screen.getByRole("button", { name: "Plantas" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getAllByRole("button", { name: "Adicionar área" }).at(-1)!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/mock/areas", expect.objectContaining({ body: JSON.stringify({ name: "Varanda", icon: "🪴" }) })));
  });

  it("manages tasks inside their area in configuration", async () => {
    const task = { id: "task-1", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você" as const, recurrence: "Diária", load: 3, completed: false };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task: { ...task, id: "task-new", name: "Lavar pia" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task: { ...task, id: "task-new", name: "Lavar pia do dia" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ task: { ...task, id: "task-new", name: "Lavar pia do dia", archived: true } }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<CasaMock household={{
      ...household,
      areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }],
      tasks: [task]
    }} />);

    fireEvent.click(screen.getByRole("button", { name: "Gerenciar Cozinha" }));
    expect(screen.getByText("Tarefas desta área")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adicionar tarefa" }));
    fireEvent.change(screen.getByLabelText("Nome da tarefa"), { target: { value: "Lavar pia" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Adicionar tarefa" }).at(-1)!);
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/mock/tasks", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByText("Lavar pia")).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("group", { name: "Tarefa Lavar pia" })).getByRole("button", { name: "Editar" }));
    expect(screen.getByText("Ajustar esforço da tarefa")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nome da tarefa"), { target: { value: "Lavar pia do dia" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/mock/tasks", expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"action":"edit"') })));
    expect(await screen.findByText("Lavar pia do dia")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remover Lavar pia do dia da rotina" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover tarefa" }));
    await waitFor(() => expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/mock/tasks", expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"action":"archive"') })));
  });
});

