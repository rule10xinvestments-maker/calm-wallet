import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProtectedLoading from "@/app/(protected)/loading";

describe("protected route loading", () => {
  it("renders a lightweight page loader instead of the branded startup splash", () => {
    const { container } = render(<ProtectedLoading />);

    expect(screen.getByRole("status", { name: "Loading page" })).toBeInTheDocument();
    expect(screen.getByText("Loading page...")).toHaveClass("sr-only");
    expect(screen.queryByText("Opening Calm Wallet...")).not.toBeInTheDocument();
    expect(screen.queryByText("by xThinker")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
