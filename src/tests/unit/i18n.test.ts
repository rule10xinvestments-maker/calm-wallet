import { describe, expect, it } from "vitest";
import { normalizeLocale, t } from "@/lib/i18n";

describe("i18n helper", () => {
  it("returns English translations by default", () => {
    expect(t("common.save", "en")).toBe("Save");
  });

  it("returns Romanian translations", () => {
    expect(t("common.save", "ro")).toBe("Salvează");
  });

  it("returns French navigation labels", () => {
    expect(t("nav.activity", "fr")).toBe("Activité");
  });

  it("falls back to English for unsupported locales", () => {
    expect(t("common.save", "de")).toBe("Save");
  });

  it("falls back safely for missing keys", () => {
    expect(t("common.notARealKey", "ro")).toBe("common.notARealKey");
  });

  it.each([
    ["ro-RO", "ro"],
    ["fr-FR", "fr"],
    ["es-ES", "es"],
    ["de-DE", "en"],
  ])("normalizes browser-like locale %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });
});
