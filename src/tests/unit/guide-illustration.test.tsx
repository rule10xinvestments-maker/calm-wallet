import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GuideIllustration } from "@/components/support/guide-illustration";

describe("GuideIllustration", () => {
  it("renders nothing when illustrations are disabled", () => {
    const { container } = render(<GuideIllustration enabled={false} kind="quickAdd" locale="en" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders localized decorative guide visuals when enabled", () => {
    render(<GuideIllustration kind="limits" locale="es" />);

    expect(screen.getByTestId("guide-illustration-limits")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Una meta, no una restricción.")).toBeInTheDocument();
  });
});
