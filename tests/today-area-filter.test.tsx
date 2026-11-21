import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MockHousehold } from "@/lib/mock/store";
import { TodayMock } from "@/components/today-mock";

const household: MockHousehold = {
  id: "house-1", name: "Nossa casa", ownerName: "Ana", ownerEmail: "ana@example.com", memberCount: 1,
  areas: [
    { id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 },
    { id: "bathroom", name: "Banheiro", icon: "🫧", sortOrder: 1 }
  ],
  tasks: [
    { id: "kitchen-task", name: "Limpar bancada", areaId: "kitchen", responsibility: "Você", recurrence: "Diária", load: 2, completed: false },
    { id: "bathroom-task", name: "Limpar pia", areaId: "bathroom", responsibility: "Você", recurrence: "Diária", load: 2, completed: false }
  ]
};

describe("Filtro de cômodo em Hoje", () => {
  it("mostra todos os cômodos agrupados por padrão sem uma aba adicional", () => {
    render(<TodayMock household={household} />);

    expect(screen.getByRole("group", { name: "Filtrar tarefas por cômodo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Cozinha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Banheiro" })).toBeInTheDocument();
    expect(screen.getByText("Limpar bancada")).toBeInTheDocument();
    expect(screen.getByText("Limpar pia")).toBeInTheDocument();
  });

  it("filtra para um cômodo com um toque e permite voltar a todos", () => {
    render(<TodayMock household={household} />);

    fireEvent.click(screen.getByRole("button", { name: /Banheiro/ }));
    expect(screen.getByRole("button", { name: /Banheiro/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Banheiro" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cozinha" })).not.toBeInTheDocument();
    expect(screen.getByText("Limpar pia")).toBeInTheDocument();
    expect(screen.queryByText("Limpar bancada")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByRole("heading", { name: "Cozinha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Banheiro" })).toBeInTheDocument();
  });
});
