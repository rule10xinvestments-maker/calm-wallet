import { describe, expect, it, vi } from "vitest";
import { createUserPreferencesService } from "@/domain/preferences/service";

function makeAdapter(overrides: Partial<Parameters<typeof createUserPreferencesService>[0]> = {}) {
  return {
    getPreferences: vi.fn(async () => ({ data: { id: "user-1", timezone: "Europe/Bucharest", ui_locale: "ro" }, error: null })),
    insertPreferences: vi.fn(async (userId: string, uiLocale: "en" | "ro" | "fr" | "es") => ({
      data: { id: userId, timezone: "UTC", ui_locale: uiLocale },
      error: null,
    })),
    updatePreferences: vi.fn(async (userId: string, uiLocale: "en" | "ro" | "fr" | "es") => ({
      data: { id: userId, timezone: "Europe/Bucharest", ui_locale: uiLocale },
      error: null,
    })),
    updateTimezone: vi.fn(async (userId: string, timezone: string) => ({
      data: { id: userId, timezone, ui_locale: "ro" },
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
      timezone: "Europe/Bucharest",
      uiLocale: "ro",
    });
  });

  it("preserves missing UI locale as no saved preference", async () => {
    const adapter = makeAdapter({
      getPreferences: vi.fn(async () => ({ data: { id: "user-1", timezone: "Europe/Bucharest", ui_locale: null }, error: null })),
    });
    const service = createUserPreferencesService(adapter);

    await expect(service.getUserPreferences("user-1")).resolves.toEqual({
      userId: "user-1",
      timezone: "Europe/Bucharest",
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

  it("updates a valid IANA timezone without using locale or country", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    const result = await service.updateUserTimezone("user-1", { timezone: "America/New_York" });

    expect(adapter.updateTimezone).toHaveBeenCalledWith("user-1", "America/New_York");
    expect(result.timezone).toBe("America/New_York");
  });

  it("rejects invalid timezones", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    await expect(service.updateUserTimezone("user-1", { timezone: "Romanian" })).rejects.toThrow();
    expect(adapter.updateTimezone).not.toHaveBeenCalled();
  });

  it("rejects invalid UI locales", async () => {
    const adapter = makeAdapter();
    const service = createUserPreferencesService(adapter);

    await expect(service.updateUserPreferences("user-1", { uiLocale: "de" as "en" })).rejects.toThrow();
    expect(adapter.updatePreferences).not.toHaveBeenCalled();
  });
});
