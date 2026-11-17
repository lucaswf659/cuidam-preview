import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockHousehold } from "@/lib/mock/store";
import { TodayMock } from "@/components/today-mock";

const household: MockHousehold = {
  id: "house-1", name: "Nossa casa", ownerName: "Ana", ownerEmail: "ana@example.com", memberCount: 1,
  areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }],
  tasks: [
    { id: "daily", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "weekly", name: "Aspirar sala", areaId: "kitchen", responsibility: "Você", recurrence: "Semanal", load: 2, completed: false },
    { id: "monthly", name: "Limpar geladeira", areaId: "kitchen", responsibility: "Você", recurrence: "Mensal", load: 3, completed: false }
  ]
};

describe("Hoje por período", () => {
  it("separa o que precisa ser feito hoje do que cabe no período", () => {
    const { container } = render(<TodayMock household={household} />);
    expect(screen.getByText("1 tarefa para cuidar hoje")).toBeInTheDocument();
    expect(screen.getByText("1 tarefa durante esta semana · 1 tarefa durante este mês")).toBeInTheDocument();
    expect(screen.queryByText("3 responsabilidades para cuidar")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".today-period-heading > span")).toHaveLength(0);
  });

  it("explica quando não há tarefas diárias pendentes", () => {
    render(<TodayMock household={{ ...household, tasks: household.tasks.slice(1) }} />);
    expect(screen.getByText("Sem tarefas diárias pendentes")).toBeInTheDocument();
    expect(screen.getByText("1 tarefa durante esta semana · 1 tarefa durante este mês")).toBeInTheDocument();
  });
});
