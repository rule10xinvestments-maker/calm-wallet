import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { LanguageSelector } from "@/components/settings/language-selector";
import type { UserPreferencesActionState } from "@/lib/actions/preferences-state";

function renderSelector(
  action: (state: UserPreferencesActionState, formData: FormData) => Promise<UserPreferencesActionState>,
) {
  return render(
    <LocaleProvider savedLocale="en">
      <LanguageSelector action={action} />
    </LocaleProvider>,
  );
}

describe("language selector", () => {
  it("renders supported language options after expanding", () => {
    renderSelector(vi.fn(async () => ({ status: "success" as const, message: "Language saved.", uiLocale: "en" as const })));

    expect(screen.getByRole("button", { name: /Language/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "🇷🇴 Română" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Language/ }));

    expect(screen.getByRole("button", { name: "🇬🇧 English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇷🇴 Română" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇫🇷 Français" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "🇪🇸 Español" })).toBeInTheDocument();
  });

  it("saves Romanian selection", async () => {
    const action = vi.fn(async (_state: UserPreferencesActionState, formData: FormData) => ({
      status: "success" as const,
      message: "Language saved.",
      uiLocale: formData.get("uiLocale") as "ro",
    }));
    renderSelector(action);

    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    fireEvent.click(screen.getByRole("button", { name: "🇷🇴 Română" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const submitted = action.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("uiLocale")).toBe("ro");
  });

  it("shows friendly save failure without raw backend errors", async () => {
    const action = vi.fn(async () => ({
      status: "error" as const,
      message: "Language could not be saved.",
      uiLocale: null,
    }));
    renderSelector(action);

    fireEvent.click(screen.getByRole("button", { name: /Language/ }));
    fireEvent.click(screen.getByRole("button", { name: "🇫🇷 Français" }));

    expect(await screen.findByText("Language could not be saved.")).toBeInTheDocument();
    expect(screen.queryByText(/database|supabase|raw/i)).not.toBeInTheDocument();
  });
});
