import en from "@/lib/i18n/locales/en.json";
import es from "@/lib/i18n/locales/es.json";
import fr from "@/lib/i18n/locales/fr.json";
import ro from "@/lib/i18n/locales/ro.json";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLocale, resolveLocalePreference, t } from "@/lib/i18n";

function flattenShape(dictionary: Record<string, unknown>, prefix = "", output: Record<string, string> = {}) {
  Object.entries(dictionary).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      output[nextKey] = "string";
      return;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      output[nextKey] = "object";
      flattenShape(value as Record<string, unknown>, nextKey, output);
      return;
    }

    output[nextKey] = Array.isArray(value) ? "array" : typeof value;
  });

  return output;
}

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

  it("keeps locale dictionary shapes compatible for live switching", () => {
    const dictionaries = { en, ro, fr, es };
    const englishShape = flattenShape(en);
    const englishKeys = Object.keys(englishShape).sort();

    for (const [locale, dictionary] of Object.entries(dictionaries)) {
      const shape = flattenShape(dictionary);
      const keys = Object.keys(shape).sort();

      expect(keys.filter((key) => !englishKeys.includes(key)), `${locale} has extra translation keys`).toEqual([]);
      expect(englishKeys.filter((key) => !keys.includes(key)), `${locale} has missing translation keys`).toEqual([]);
      expect(
        englishKeys.filter((key) => shape[key] !== englishShape[key]),
        `${locale} has mismatched translation value shapes`,
      ).toEqual([]);
    }
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
    expect(t("notifications.calmHelper", "en")).toBe("Allow Calm Wallet to send helpful reminders.");
    expect(t("notifications.calmHelper", "ro")).toBe("Permite aplicației Calm Wallet să trimită mementouri utile.");
    expect(t("notifications.calmHelper", "fr")).toBe("Autorisez Calm Wallet à envoyer des rappels utiles.");
    expect(t("notifications.calmHelper", "es")).toBe("Permite que Calm Wallet envíe recordatorios útiles.");
    expect(t("notifications.disabledHelper", "en")).toBe("Notifications are disabled.");
    expect(t("notifications.disabledHelper", "ro")).toBe("Notificările sunt dezactivate.");
    expect(t("notifications.disabledHelper", "fr")).toBe("Les notifications sont désactivées.");
    expect(t("notifications.disabledHelper", "es")).toBe("Las notificaciones están desactivadas.");
    expect(t("notifications.permissionRequired", "ro")).toBe("Este necesară permisiunea");
    expect(t("notifications.openBrowserSettings", "ro")).toBe("Deschide setările browserului pentru a permite notificările.");
    expect(t("notifications.unsupported", "ro")).toBe("Notificările nu sunt disponibile pe acest dispozitiv.");
    expect(t("notifications.updateError", "ro")).toBe("Nu am putut actualiza setările de notificări. Încearcă din nou.");
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
    expect(t("assistant.owed.owedToMeHelper", "fr")).toBe("À recevoir.");
    expect(t("assistant.owed.iOweHelper", "fr")).toBe("À payer.");
    expect(t("assistant.owed.createNoteHelper", "fr")).toBe("Ajoutez un rappel.");
    expect(t("owed.createOwedNote", "fr")).toBe("Créer un rappel");
    expect(t("owed.dueDateShort", "fr")).toBe("Date");
    expect(t("owed.noOpenReminders", "fr")).toBe("Aucun rappel actif.");
    expect(t("owed.noOwedToMe", "fr")).toBe("Rien à recevoir.");
    expect(t("owed.noIOwe", "fr")).toBe("Rien à payer.");
    expect(t("assistant.limits.createHelper", "ro")).toBe("Limită pe categorie.");
    expect(t("assistant.limits.manageHelper", "ro")).toBe("Editează sau oprește limite.");
    expect(t("assistant.limits.helper", "fr")).toBe("Définissez vos limites.");
    expect(t("assistant.limits.createHelper", "fr")).toBe("Limite par catégorie.");
    expect(t("assistant.limits.periodButtons.weekly", "fr")).toBe("Semaine");
    expect(t("assistant.limits.periodButtons.monthly", "fr")).toBe("Mois");
    expect(t("assistant.limits.repeatWeekly", "fr")).toBe("Répéter chaque semaine");
    expect(t("assistant.limits.repeatMonthly", "fr")).toBe("Répéter chaque mois");
    expect(t("common.merchant", "fr")).toBe("Magasin");
    expect(t("assistant.manual.merchantAdded", "fr")).toBe("Magasin ajouté");
    expect(t("assistant.manual.optionalMerchant", "fr")).toBe("Magasin optionnel");
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

  it("keeps notification settings component copy behind i18n keys", () => {
    const source = readFileSync(join(process.cwd(), "src/components/notifications/notification-preferences-card.tsx"), "utf8");
    const hardcodedCopy = [
      "Allow Calm Wallet to send helpful reminders.",
      "Notifications are enabled.",
      "Notifications are disabled.",
      "Enable notifications",
      "Disable notifications",
      "Open browser settings to allow notifications.",
      "Notifications are not supported on this device.",
      "We could not update notification settings. Please try again.",
    ];

    hardcodedCopy.forEach((copy) => {
      expect(source).not.toContain(`>${copy}<`);
      expect(source).not.toContain(`"${copy}"`);
    });
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
