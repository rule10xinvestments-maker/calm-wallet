import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import Loading from "@/app/loading";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

describe("loading screen", () => {
  it("renders the compact Calm Wallet loader without the branded startup splash", () => {
    const { container } = render(<Loading />);

    expect(screen.getByRole("status", { name: "Loading Calm Wallet" })).toBeInTheDocument();
    expect(screen.getByText("Calm Wallet")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/icons/calm-wallet-icon-512.png");
    expect(container.querySelector(".protected-route-loader__mark")).toBeInTheDocument();
    expect(container.querySelectorAll(".protected-route-loader__lines span")).toHaveLength(3);
    expect(screen.queryByText("by xThinker")).not.toBeInTheDocument();
    expect(screen.queryByText("Track money. Understand more. Live calm.")).not.toBeInTheDocument();
    expect(screen.queryByText("Opening Calm Wallet...")).not.toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
