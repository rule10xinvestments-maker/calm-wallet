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
    expect(within(dialog).getByText(/Version 1.1/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Welcome to Calm Wallet/)).toBeInTheDocument();
    expect(within(dialog).getByText("Credits never expire")).toBeInTheDocument();
    expect(within(dialog).getByText(/Replaced placeholder legal text with the final launch documents/)).toBeInTheDocument();
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

  it("uses canonical English legal body as fallback in non-English locales", () => {
    render(<LegalAcceptanceScreen action={vi.fn()} savedLocale="ro" />);

    fireEvent.click(screen.getAllByRole("button", { name: /Citește/ })[0]);
    const dialog = screen.getByRole("dialog", { name: "Termeni și condiții" });

    expect(within(dialog).getByText(/Textul legal este disponibil/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Welcome to Calm Wallet/)).toBeInTheDocument();
  });
});
