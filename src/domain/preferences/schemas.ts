import { z } from "zod";
import { supportedLocales } from "@/lib/i18n";

export const updateUserPreferencesSchema = z.object({
  uiLocale: z.enum(supportedLocales),
});

export const updateUserTimezoneSchema = z.object({
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date("2026-01-01T00:00:00.000Z"));
        return true;
      } catch {
        return false;
      }
    }, "Invalid timezone."),
});
