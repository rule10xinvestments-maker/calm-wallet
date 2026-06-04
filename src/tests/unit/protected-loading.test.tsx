import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import ProtectedLoading from "@/app/(protected)/loading";

vi.mock("next/image", () => ({
  default: ({ alt, className, src }: { alt: string; className?: string; src: string }) =>
    createElement("img", { alt, className, src }),
}));

describe("protected route loading", () => {
  it("renders the recovered compact icon, label, and three bars instead of the branded startup splash", () => {
    const { container } = render(<ProtectedLoading />);

    expect(screen.getByRole("status", { name: "Loading page" })).toBeInTheDocument();
    expect(screen.getByText("Loading page...")).toHaveClass("sr-only");
    expect(screen.getByText("Calm Wallet")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/icons/calm-wallet-maskable-512.png");
    expect(container.querySelector(".protected-route-loader__mark")).toBeInTheDocument();
    expect(container.querySelectorAll(".protected-route-loader__lines span")).toHaveLength(3);
    expect(screen.queryByText("Opening Calm Wallet...")).not.toBeInTheDocument();
    expect(screen.queryByText("by xThinker")).not.toBeInTheDocument();
    expect(screen.queryByText("Track money. Understand more. Live calm.")).not.toBeInTheDocument();
  });
});
