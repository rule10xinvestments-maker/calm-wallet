import { describe, expect, it, vi } from "vitest";
import { createUserPreferencesService } from "@/domain/preferences/service";

function makeAdapter(overrides: Partial<Parameters<typeof createUserPreferencesService>[0]> = {}) {
  return {
    getPreferences: vi.fn(async () => ({ data: { id: "user-1", ui_locale: "ro" }, error: null })),
    insertPreferences: vi.fn(async (userId: string, uiLocale: "en" | "ro" | "fr" | "es") => ({
      data: { id: userId, ui_locale: uiLocale },
      error: null,
    })),
    updatePreferences: vi.fn(async (userId: string, uiLocale: "en" | "ro" | "fr" | "es") => ({
      data: { id: userId, ui_locale: uiLocale },
      error: null,
    })),
    ...overrides,
  };
}

describe("user preferences domain", () => {
  it("maps saved UI locale", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    await expect(service.getUserPreferences("user-1")).resolves.toEqual({
      userId: "user-1",
      uiLocale: "ro",
    });
  });

  it("preserves missing UI locale as no saved preference", async () => {
    const adapter = makeAdapter({
      getPreferences: vi.fn(async () => ({ data: { id: "user-1", ui_locale: null }, error: null })),
    });
    const service = createUserPreferencesService(adapter);

    await expect(service.getUserPreferences("user-1")).resolves.toEqual({
      userId: "user-1",
      uiLocale: null,
    });
  });

  it("updates a valid saved UI locale", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    const result = await service.updateUserPreferences("user-1", { uiLocale: "es" });

    expect(adapter.updatePreferences).toHaveBeenCalledWith("user-1", "es");
    expect(result.uiLocale).toBe("es");
  });

  it("rejects invalid UI locales", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    await expect(service.updateUserPreferences("user-1", { uiLocale: "de" as "en" })).rejects.toThrow();
    expect(adapter.updatePreferences).not.toHaveBeenCalled();
  });
});
