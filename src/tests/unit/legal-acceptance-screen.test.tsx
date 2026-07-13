import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LegalAcceptanceScreen } from "@/components/legal/legal-acceptance-screen";

describe("legal acceptance screen", () => {
  it("blocks continue until the current legal documents are accepted", async () => {
    const action = vi.fn(async () => ({ status: "idle" as const, message: null }));

    render(<LegalAcceptanceScreen action={action} savedLocale="en" />);

    expect(screen.getByRole("heading", { name: "We've updated our legal documents" })).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Refund Policy")).toBeInTheDocument();
    expect(screen.getByText("AI Disclaimer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept and continue" })).toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: /Read/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Terms of Service" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Placeholder for the production Terms of Service/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close legal document" }));

    fireEvent.click(screen.getByLabelText("I have read and accept the current legal documents."));
    const button = screen.getByRole("button", { name: "Accept and continue" });
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() => expect(action).toHaveBeenCalled());
  });

  it("renders localized acceptance copy", () => {
    render(<LegalAcceptanceScreen action={vi.fn()} savedLocale="ro" />);

    expect(screen.getByRole("heading", { name: "Am actualizat documentele legale" })).toBeInTheDocument();
    expect(screen.getByText("Politica de confidențialitate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acceptă și continuă" })).toBeDisabled();
  });
});
