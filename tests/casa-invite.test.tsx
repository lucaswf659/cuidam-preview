import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CasaMock } from "@/components/casa-mock";

const household = {
  name: "Nossa casa de teste",
  ownerName: "Pessoa de teste",
  areas: []
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
});

