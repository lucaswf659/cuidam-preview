import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppChrome } from "@/components/app-chrome";

describe("AppChrome", () => {
  it("keeps all four destinations available and marks the current section", () => {
    render(<AppChrome current="nos" />);

    const navigation = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nós" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Hoje" })).not.toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Recompensas" })).toHaveAttribute("href", "/rewards");
    expect(screen.getByRole("link", { name: "Casa" })).toHaveAttribute("href", "/casa");
    expect(navigation.querySelectorAll(".primary-nav__icon-shell")).toHaveLength(4);
    expect(navigation.querySelector(".primary-nav__icon-shell--people svg")).toBeInTheDocument();
  });

  it("uses the Cuidam house and leaf mark in the shared navigation", () => {
    render(<AppChrome current="today" />);

    expect(screen.getAllByRole("img", { name: "Casa com broto" })).toHaveLength(2);
  });
});

