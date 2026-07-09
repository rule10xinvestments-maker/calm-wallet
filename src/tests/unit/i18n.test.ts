import { describe, expect, it } from "vitest";
import { normalizeLocale, resolveLocalePreference, t } from "@/lib/i18n";

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

  it("falls back safely for malformed runtime inputs", () => {
    expect(normalizeLocale({ locale: "ro" })).toBe("en");
    expect(t("common.save", { locale: "ro" })).toBe("Save");
    expect(t(null as never, "ro")).toBe("");
  });

  it("interpolates safely and keeps missing params readable", () => {
    expect(t("insights.bars.amountsShowCategoryOnly", "en", { bucket: "Day", category: "Groceries" })).toBe(
      "Day amounts show Groceries only",
    );
    expect(t("insights.bars.amountsShowCategoryOnly", "ro", { bucket: "Zi" })).toContain("{category}");
  });

  it("returns audited import and notification labels in supported locales", () => {
    expect(t("assistant.imports.chooseFileFirst", "ro")).toBe("Alege mai întâi o imagine de bon sau un fișier CSV.");
    expect(t("imports.noCandidatesYet", "fr")).toBe("Aucun candidat pour le moment.");
    expect(t("notifications.saveSettings", "es")).toBe("Guardar ajustes de notificaciones");
    expect(t("notifications.disabledHelper", "en")).toBe("Notifications are disabled.");
    expect(t("notifications.disabledHelper", "ro")).toBe("Notificările sunt dezactivate.");
    expect(t("notifications.disabledHelper", "fr")).toBe("Les notifications sont désactivées.");
    expect(t("notifications.disabledHelper", "es")).toBe("Las notificaciones están desactivadas.");
    expect(t("assistant.actions.owed", "es")).toBe("Pendientes");
    expect(t("assistant.owed.title", "es")).toBe("Pendientes");
    expect(t("assistant.owed.helper", "ro")).toBe("Ține evidența banilor de primit și de plătit.");
    expect(t("assistant.owed.owedToMeHelper", "ro")).toBe("Ce ai de primit.");
    expect(t("assistant.owed.iOweHelper", "ro")).toBe("Ce ai de plătit.");
    expect(t("owed.createOwedNote", "es")).toBe("Crear recordatorio");
    expect(t("owed.updated", "ro")).toBe("Actualizat");
    expect(t("owed.dueDateShort", "ro")).toBe("Termen");
    expect(t("owed.noOpenReminders", "ro")).toBe("Nu ai remindere active.");
    expect(t("owed.noOwedToMe", "ro")).toBe("Nu ai bani de primit.");
    expect(t("owed.noIOwe", "ro")).toBe("Nu ai datorii de plătit.");
    expect(t("assistant.limits.createHelper", "ro")).toBe("Limită pe categorie.");
    expect(t("assistant.limits.manageHelper", "ro")).toBe("Editează sau oprește limite.");
    expect(t("assistant.limits.helper", "fr")).toBe("Définissez vos limites.");
    expect(t("assistant.limits.createHelper", "fr")).toBe("Limite par catégorie.");
    expect(t("assistant.limits.periodButtons.weekly", "fr")).toBe("Semaine");
    expect(t("assistant.limits.periodButtons.monthly", "fr")).toBe("Mois");
    expect(t("assistant.limits.repeatWeekly", "fr")).toBe("Répéter chaque semaine");
    expect(t("assistant.limits.repeatMonthly", "fr")).toBe("Répéter chaque mois");
    expect(t("activity.time.applyRange", "ro")).toBe("Aplică intervalul");
    expect(t("activity.time.clearCustomRange", "fr")).toBe("Effacer la plage");
    expect(t("activity.time.startDate", "es")).toBe("Fecha inicial");
    expect(t("activity.time.chooseDates", "en")).toBe("Choose dates");
    expect(t("activity.time.customRangeCompact", "en")).toBe("Custom");
    expect(t("activity.time.customRangeCompact", "ro")).toBe("Interval");
    expect(t("activity.time.customRangeCompact", "fr")).toBe("Période");
    expect(t("activity.time.customRangeCompact", "es")).toBe("Rango");
    expect(t("activity.time.pickDateCompact", "en")).toBe("Pick date");
    expect(t("activity.time.pickDateCompact", "ro")).toBe("Alege data");
    expect(t("activity.time.enterValidDate", "ro")).toBe("Introdu o dată validă");
    expect(t("activity.time.endDateMustBeAfterStartDate", "es")).toBe("La fecha final debe ser posterior a la inicial");
    expect(t("activity.time.typeDates", "ro")).toBe("Scrie datele");
    expect(t("activity.time.hideManualEntry", "fr")).toBe("Masquer la saisie manuelle");
    expect(t("activity.time.pickStartDate", "es")).toBe("Elige la fecha inicial");
    expect(t("activity.time.type", "ro")).toBe("Scrie");
    expect(t("activity.time.closeCustom", "fr")).toBe("Fermer la plage");
    expect(t("activity.inspect.viewInActivity", "ro")).toBe("Vezi în Activitate");
    expect(t("activity.inspect.showingCategory", "es", { category: "Inversiones" })).toBe("Mostrando Inversiones");
    expect(t("common.clear", "fr")).toBe("Effacer");
  });

  it.each([
    ["ro-RO", "ro"],
    ["fr-FR", "fr"],
    ["es-ES", "es"],
    ["de-DE", "en"],
  ])("normalizes browser-like locale %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it("resolves unsupported browser locale to English when no preference is saved", () => {
    expect(resolveLocalePreference({ savedLocale: null, browserLocale: "de-DE" })).toBe("en");
  });

  it("resolves supported browser locales when no preference is saved", () => {
    expect(resolveLocalePreference({ savedLocale: null, browserLocale: "ro-RO" })).toBe("ro");
    expect(resolveLocalePreference({ savedLocale: null, browserLocale: "fr-FR" })).toBe("fr");
    expect(resolveLocalePreference({ savedLocale: null, browserLocale: "es-ES" })).toBe("es");
  });

  it("lets saved preference override browser locale", () => {
    expect(resolveLocalePreference({ savedLocale: "fr", browserLocale: "ro-RO" })).toBe("fr");
  });

  it("falls back to English for invalid saved locale", () => {
    expect(resolveLocalePreference({ savedLocale: "not-real", browserLocale: "ro-RO" })).toBe("en");
  });
});
