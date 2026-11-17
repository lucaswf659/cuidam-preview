import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockHousehold } from "@/lib/mock/store";
import { NosMock } from "@/components/nos-mock";

const household: MockHousehold = {
  id: "house-1",
  name: "Nossa casa",
  ownerName: "Lucas",
  ownerEmail: "lucas@example.com",
  memberCount: 1,
  areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }],
  tasks: [
    { id: "task-1", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "task-2", name: "Esvaziar lava-louças", areaId: "kitchen", responsibility: "Nós", recurrence: "Semanal", load: 2, completed: false }
  ]
};

describe("NosMock balance summary", () => {
  it("opens areas with a centered chevron and keeps the card free of redundant task counts", () => {
    const { container } = render(<NosMock household={household} />);
    const areaButton = screen.getByRole("button", { name: "Ver tarefas da área Cozinha" });

    expect(areaButton.querySelector(".nos-area-chevron svg")).toBeInTheDocument();
    expect(container.querySelector(".area-count")).not.toBeInTheDocument();
  });

  it("does not show a second-person comparison while the household has one member", () => {
    render(<NosMock household={household} />);

    expect(screen.getByText("Por enquanto, só você")).toBeInTheDocument();
    expect(screen.queryByText(/Outra pessoa ·/)).not.toBeInTheDocument();
    expect(screen.getByText(/Compartilhadas ·/)).toBeInTheDocument();
    expect(screen.getByText("Quando outra pessoa entrar na casa, a divisão entre vocês aparece aqui.")).toBeInTheDocument();
  });

  it("shows the comparison after another active member joins", () => {
    const householdWithTwoMembers: MockHousehold = {
      ...household,
      memberCount: 2,
      tasks: [...household.tasks, { id: "task-3", name: "Limpar mesa", areaId: "kitchen", responsibility: "Outra pessoa", recurrence: "Diária", load: 2, completed: false }]
    };
    render(<NosMock household={householdWithTwoMembers} />);

    expect(screen.getByText("Outra pessoa ·", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText("Por enquanto, só você")).not.toBeInTheDocument();
  });

  it("uses neutral wording when the other member has no personal responsibilities yet", () => {
    render(<NosMock household={{ ...household, memberCount: 2 }} />);
    expect(screen.getByText("A divisão pessoal ainda não começou")).toBeInTheDocument();
    expect(screen.getByText("A divisão considera o peso e a frequência. As tarefas compartilhadas também fazem parte do cuidado da casa.")).toBeInTheDocument();
    expect(screen.queryByText("Ainda falta dividir com outra pessoa")).not.toBeInTheDocument();
  });

  it("does not count an empty house as entirely shared work", () => {
    render(<NosMock household={{ ...household, tasks: [] }} />);

    expect(screen.getByText("Ainda sem divisão")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Suas tarefas 0 por cento, compartilhadas 0 por cento" })).toBeInTheDocument();
  });
});
