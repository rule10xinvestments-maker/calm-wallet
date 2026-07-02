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
  it("renders supported language options", () => {
    renderSelector(vi.fn(async () => ({ status: "success" as const, message: "Language saved.", uiLocale: "en" as const })));

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Română" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Français" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Español" })).toBeInTheDocument();
  });

  it("saves Romanian selection", async () => {
    const action = vi.fn(async (_state: UserPreferencesActionState, formData: FormData) => ({
      status: "success" as const,
      message: "Language saved.",
      uiLocale: formData.get("uiLocale") as "ro",
    }));
    renderSelector(action);

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "ro" } });

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

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "fr" } });

    expect(await screen.findByText("Language could not be saved.")).toBeInTheDocument();
    expect(screen.queryByText(/database|supabase|raw/i)).not.toBeInTheDocument();
  });
});
