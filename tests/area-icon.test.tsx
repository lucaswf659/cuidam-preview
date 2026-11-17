import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AreaIcon } from "@/components/area-icon";

describe("AreaIcon", () => {
  it("renders a colorful house illustration for a default area", () => {
    const { container } = render(<AreaIcon name="Cozinha" fallback="🍳" className="task-area-icon" />);
    const icon = container.querySelector(".area-symbol--cozinha svg");

    expect(icon).toHaveAttribute("viewBox", "0 0 32 32");
    expect(icon?.querySelector(".area-icon-accent")).toBeInTheDocument();
    expect(container.querySelector(".area-symbol")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps custom area icons provided by the household", () => {
    const { container } = render(<AreaIcon name="Quarto de hóspedes" fallback="🌙" />);

    expect(container).toHaveTextContent("🌙");
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});
