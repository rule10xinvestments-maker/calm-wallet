import { z } from "zod";
import { supportedLocales } from "@/lib/i18n";

export const updateUserPreferencesSchema = z.object({
  uiLocale: z.enum(supportedLocales),
});
