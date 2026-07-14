import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicAccountDeletionPage } from "@/components/account/public-account-deletion-page";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { initialAccountDeletionActionState } from "@/lib/actions/account-deletion-state";

describe("public account deletion page", () => {
  it("works while signed out and does not expose whether an email exists", async () => {
    const requestAction = vi.fn(async () => ({
      status: "success" as const,
      message: "If the email is linked to a Calm Wallet account, a verification link has been sent.",
    }));
    const deleteAction = vi.fn(async () => initialAccountDeletionActionState);

    render(
      <LocaleProvider savedLocale="en">
        <PublicAccountDeletionPage
          deleteAction={deleteAction}
          deletionAvailable
          requestAction={requestAction}
          verified={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "Calm Wallet account deletion" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "unknown@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Request deletion link" }));

    await waitFor(() => expect(requestAction).toHaveBeenCalled());
    expect(await screen.findByText("If the email is linked to a Calm Wallet account, a verification link has been sent.")).toBeInTheDocument();
    expect(deleteAction).not.toHaveBeenCalled();
  });

  it("does not activate the public request form when the deletion schema is unavailable", () => {
    render(
      <LocaleProvider savedLocale="en">
        <PublicAccountDeletionPage
          deleteAction={vi.fn()}
          deletionAvailable={false}
          requestAction={vi.fn()}
          verified={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Account deletion requests are not available until the deletion database migration is applied.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request deletion link" })).toBeDisabled();
  });
});
