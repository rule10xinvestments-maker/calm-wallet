import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "@/components/layout/bottom-nav";

let pathname = "/assistant";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("bottom navigation", () => {
  beforeEach(() => {
    pathname = "/assistant";
  });

  it("shows immediate active feedback on tap while route navigation is pending", () => {
    render(<BottomNav />);

    const assistant = screen.getByRole("link", { name: /assistant/i });
    const activity = screen.getByRole("link", { name: /activity/i });

    expect(assistant).toHaveClass("bg-sky-50");
    expect(assistant.querySelector("svg")).toHaveClass("lucide-notebook-pen");
    expect(activity).not.toHaveClass("bg-sky-50");

    activity.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(activity);

    expect(activity).toHaveClass("bg-sky-50");
  });
});
