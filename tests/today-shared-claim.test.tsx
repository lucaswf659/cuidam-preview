import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TodayMock } from "@/components/today-mock";

const household = {
  name: "Nossa casa",
  ownerName: "Lucas Ferreira",
  areas: [{ id: "kitchen", name: "Cozinha", icon: "🍳", sortOrder: 0 }],
  tasks: [{ id: "task-1", name: "Lavar a louça", areaId: "kitchen", responsibility: "Nós" as const, recurrence: "Semanal", load: 2, completed: false }]
};

describe("TodayMock shared task claim", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("reserves a task before completion and shows the completed state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: { ...household.tasks[0], claimInProgress: true, claimOwnedByCurrentUser: true, claimOwnerName: "Lucas" } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ task: { ...household.tasks[0], completed: true } })
      });
    vi.stubGlobal("fetch", fetchMock);
    render(<TodayMock household={household} />);

    expect(screen.getByRole("button", { name: "Vou cuidar" })).toHaveClass("claim-action");
    fireEvent.click(screen.getByRole("button", { name: "Vou cuidar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "✓ Concluir" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "✓ Concluir" })).toHaveClass("complete-action");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ taskId: "task-1", action: "claim" });

    fireEvent.click(screen.getByRole("button", { name: "✓ Concluir" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tudo certo por hoje." })).toBeInTheDocument());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ taskId: "task-1" });
  });

  it("does not offer completion when another person has claimed the task", () => {
    render(<TodayMock household={{ ...household, tasks: [{ ...household.tasks[0], claimInProgress: true, claimOwnedByCurrentUser: false, claimOwnerName: "Ana" }] }} />);

    expect(screen.getByText("Em andamento com Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Vou cuidar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "✓ Concluir" })).not.toBeInTheDocument();
  });
});

