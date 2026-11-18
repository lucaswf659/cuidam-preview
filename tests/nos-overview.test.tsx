import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockHousehold } from "@/lib/mock/store";
import { NosMock } from "@/components/nos-mock";

const household: MockHousehold = {
  id: "house-1",
  name: "Nossa casa",
  ownerName: "Lucas",
  ownerEmail: "lucas@example.com",
  memberCount: 2,
  areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }],
  tasks: [
    { id: "task-1", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "task-2", name: "Esvaziar lava-louças", areaId: "kitchen", responsibility: "Nós", recurrence: "Semanal", load: 2, completed: true, completedAt: "2026-11-18T12:00:00.000Z" }
  ]
};

describe("NosMock responsibility overview", () => {
  it("shows responsibilities by area without scoring or a completion feed", () => {
    render(<NosMock household={household} />);

    expect(screen.getByRole("heading", { name: "Quem cuida do quê?" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Responsabilidades por área" })).toBeInTheDocument();
    expect(screen.getByText("Responsáveis: Você · Compartilhada")).toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Atividade recente|ocorrência concluída/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Por enquanto, só você")).not.toBeInTheDocument();
  });

  it("opens a read-only task list for the selected area", () => {
    render(<NosMock household={household} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver tarefas da área Cozinha" }));

    expect(screen.getByRole("dialog", { name: /Cozinha/ })).toBeInTheDocument();
    expect(screen.getByText("Limpar bancada")).toBeInTheDocument();
    expect(screen.getByText("Esvaziar lava-louças")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar|Adicionar tarefa|Remover/ })).not.toBeInTheDocument();
  });

  it("keeps an empty area informative without offering management actions", () => {
    render(<NosMock household={{ ...household, areas: [{ ...household.areas[0], name: "Varanda" }], tasks: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver tarefas da área Varanda" }));

    expect(screen.getByText("Ainda não tem tarefas nesta área.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Adicionar tarefa/ })).not.toBeInTheDocument();
  });
});
