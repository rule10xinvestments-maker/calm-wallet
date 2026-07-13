import type { Database } from "@/lib/db/types";
import type { SupportedLocale } from "@/lib/i18n";

export type UserPreferencesRow = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "timezone" | "ui_locale">;

export type UserPreferences = {
  userId: string;
  timezone: string | null;
  uiLocale: SupportedLocale | null;
};
