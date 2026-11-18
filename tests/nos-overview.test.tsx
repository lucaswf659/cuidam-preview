import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockHousehold } from "@/lib/mock/store";
import { NosMock } from "@/components/nos-mock";

const household: MockHousehold = {
  id: "house-1",
  name: "Nossa casa",
  ownerName: "Lucas",
  ownerEmail: "lucas@example.com",
  memberCount: 2,
  members: [
    { id: "member-1", name: "Lucas", current: true },
    { id: "member-2", name: "Ana", current: false }
  ],
  areas: [
    { id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 },
    { id: "bathroom", name: "Banheiro", icon: "🛁", sortOrder: 1 }
  ],
  tasks: [
    { id: "task-1", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "task-2", name: "Esvaziar lava-louças", areaId: "kitchen", responsibility: "Outra pessoa", recurrence: "Semanal", load: 2, completed: true, completedAt: "2026-11-18T12:00:00.000Z" },
    { id: "task-3", name: "Limpar pia", areaId: "bathroom", responsibility: "Nós", recurrence: "Mensal", load: 2, completed: false },
    { id: "task-4", name: "Tarefa arquivada", areaId: "bathroom", responsibility: "Você", recurrence: "Diária", load: 2, completed: false, archived: true }
  ]
};

describe("NosMock responsibility overview", () => {
  it("shows tasks directly grouped by the person responsible or as shared", () => {
    render(<NosMock household={household} />);

    expect(screen.getByRole("heading", { name: "Quem cuida do quê?" })).toBeInTheDocument();
    const lucasGroup = screen.getByRole("region", { name: /Lucas cuida/ });
    const anaGroup = screen.getByRole("region", { name: /Ana cuida/ });
    const sharedGroup = screen.getByRole("region", { name: /Vocês cuidam juntos/ });

    expect(within(lucasGroup).getByText("Limpar bancada")).toBeInTheDocument();
    expect(within(lucasGroup).getByText(/Cozinha.*Diária/)).toBeInTheDocument();
    expect(within(anaGroup).getByText("Esvaziar lava-louças")).toBeInTheDocument();
    expect(within(sharedGroup).getByText("Limpar pia")).toBeInTheDocument();
    expect(screen.queryByText("Tarefa arquivada")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Atividade recente|ocorrência concluída/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Editar|Adicionar tarefa|Remover/ })).not.toBeInTheDocument();
  });

  it("keeps the solo household focused on its person and shared tasks", () => {
    render(<NosMock household={{ ...household, memberCount: 1, members: [household.members![0]], tasks: household.tasks.filter((task) => task.responsibility !== "Outra pessoa") }} />);

    expect(screen.getByRole("region", { name: /Lucas cuida/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Ana cuida|Outra pessoa cuida/ })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Vocês cuidam juntos/ })).toBeInTheDocument();
  });

  it("explains when a responsibility group has no tasks", () => {
    render(<NosMock household={{ ...household, tasks: [] }} />);

    expect(screen.getAllByText("Nenhuma tarefa nesta divisão por enquanto.")).toHaveLength(3);
  });
});
