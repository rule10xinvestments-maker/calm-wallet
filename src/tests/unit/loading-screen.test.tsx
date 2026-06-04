import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import Loading from "@/app/loading";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

describe("loading screen", () => {
  it("renders the Calm Wallet startup brand lockup without fake progress", () => {
    render(<Loading />);

    expect(screen.getByRole("status", { name: "Calm Wallet is opening" })).toBeInTheDocument();
    expect(screen.getByLabelText("Calm Wallet")).toBeInTheDocument();
    expect(screen.getByText("by xThinker")).toBeInTheDocument();
    expect(screen.getByText("Track money. Understand more. Live calm.")).toBeInTheDocument();
    expect(screen.getByText("Opening Calm Wallet...")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
});
