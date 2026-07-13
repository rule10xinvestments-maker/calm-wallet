import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedSession = vi.fn();
const updateUserPreferences = vi.fn();
const updateUserTimezone = vi.fn();
const createSupabaseUserPreferencesService = vi.fn(async () => ({
  updateUserPreferences,
  updateUserTimezone,
}));
const revalidatePath = vi.fn();

vi.mock("@/lib/auth/guards", () => ({
  requireAuthenticatedSession,
}));

vi.mock("@/domain/preferences/service", () => ({
  createSupabaseUserPreferencesService,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

describe("user preferences action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthenticatedSession.mockResolvedValue({ user: { id: "user-1" } });
    updateUserPreferences.mockResolvedValue({ userId: "user-1", timezone: "Europe/Bucharest", uiLocale: "ro" });
    updateUserTimezone.mockResolvedValue({ userId: "user-1", timezone: "Europe/Bucharest", uiLocale: "ro" });
  });

  it("updates UI locale for the authenticated user", async () => {
    const { updateUserPreferencesAction } = await import("@/lib/actions/preferences");
    const formData = new FormData();
    formData.set("uiLocale", "ro");

    const result = await updateUserPreferencesAction({ status: "idle", message: null, uiLocale: null }, formData);

    expect(updateUserPreferences).toHaveBeenCalledWith("user-1", { uiLocale: "ro" });
    expect(revalidatePath).toHaveBeenCalledWith("/assistant");
    expect(revalidatePath).toHaveBeenCalledWith("/transactions");
    expect(revalidatePath).toHaveBeenCalledWith("/insights");
    expect(result).toEqual({ status: "success", message: "Language saved.", uiLocale: "ro" });
  });

  it("rejects unsupported locales without saving", async () => {
    const { updateUserPreferencesAction } = await import("@/lib/actions/preferences");
    const formData = new FormData();
    formData.set("uiLocale", "de");

    const result = await updateUserPreferencesAction({ status: "idle", message: null, uiLocale: null }, formData);

    expect(updateUserPreferences).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.message).toBe("Language could not be saved.");
  });

  it("returns friendly error copy on save failure", async () => {
    updateUserPreferences.mockRejectedValueOnce(new Error("raw database error"));
    const { updateUserPreferencesAction } = await import("@/lib/actions/preferences");
    const formData = new FormData();
    formData.set("uiLocale", "fr");

    const result = await updateUserPreferencesAction({ status: "idle", message: null, uiLocale: null }, formData);

    expect(result).toEqual({ status: "error", message: "Language could not be saved.", uiLocale: null });
    expect(result.message).not.toContain("raw database error");
  });

  it("updates a detected IANA timezone for the authenticated user", async () => {
    const { updateUserTimezoneAction } = await import("@/lib/actions/preferences");

    await updateUserTimezoneAction("Europe/Bucharest");

    expect(updateUserTimezone).toHaveBeenCalledWith("user-1", { timezone: "Europe/Bucharest" });
  });

  it("ignores timezone sync failures without exposing raw errors", async () => {
    updateUserTimezone.mockRejectedValueOnce(new Error("raw database error"));
    const { updateUserTimezoneAction } = await import("@/lib/actions/preferences");

    await expect(updateUserTimezoneAction("America/New_York")).resolves.toBeUndefined();
  });
});
