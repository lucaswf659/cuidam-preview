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
});
