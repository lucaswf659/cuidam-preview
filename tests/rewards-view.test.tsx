import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/app-chrome", () => ({ AppChrome: () => <nav>Navigation</nav> }));
import { RewardsView } from "@/components/rewards-view";

describe("RewardsView loading recovery", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("replaces a failed load with a retry action and recovers on retry", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Falha ao buscar dados." }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ balance: 0, rewards: [], members: [], history: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<RewardsView householdName="Nossa casa" />);
    fireEvent.click(await screen.findByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByText(/Ainda não há recompensas/)).toBeInTheDocument());
    expect(screen.queryByText("Carregando recompensas…")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("adds a starter reward with its suggested cost", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ balance: 0, rewards: [], members: [], history: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ reward: { id: "reward-1" } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ balance: 0, rewards: [{ id: "reward-1", name: "Escolher o filme da noite", cost: 30, recipientType: "HOUSEHOLD", recipientMemberId: null }], members: [], history: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<RewardsView householdName="Nossa casa" />);
    fireEvent.click(await screen.findByRole("button", { name: "Adicionar recompensa: Escolher o filme da noite" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Escolher o filme da noite" })).toBeInTheDocument());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ name: "Escolher o filme da noite", cost: 30, recipientType: "HOUSEHOLD" });
  });
});
