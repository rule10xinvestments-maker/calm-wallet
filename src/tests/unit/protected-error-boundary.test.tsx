import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProtectedError from "@/app/(protected)/error";

describe("protected error boundary", () => {
  it("renders calm recovery actions without data details", () => {
    const reset = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<ProtectedError error={Object.assign(new Error("sensitive failure"), { digest: "1459637102" })} reset={reset} />);

    expect(screen.getByText("We could not load this view.")).toBeInTheDocument();
    expect(screen.getByText("Your data was not changed. Try again, or return home and reopen the view.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/assistant");

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("sensitive failure");
    errorSpy.mockRestore();
  });
});
