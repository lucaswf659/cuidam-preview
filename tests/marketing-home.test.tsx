import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarketingHome } from "@/components/marketing-home";

describe("MarketingHome", () => {
  it("apresenta o produto e encaminha para cadastro e login do app", () => {
    render(<MarketingHome />);

    expect(screen.getByRole("heading", { name: "A casa não precisa morar na cabeça de uma pessoa só." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar?mode=login");
    expect(screen.getByRole("link", { name: /^Começar$/ })).toHaveAttribute("href", "/entrar?mode=signup");
    expect(screen.getByRole("link", { name: "Organizar nossa casa" })).toHaveAttribute("href", "/entrar?mode=signup");
  });
});
