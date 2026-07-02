import type { SupportedLocale } from "@/lib/i18n";

export type UserPreferencesActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  uiLocale: SupportedLocale | null;
};

export const initialUserPreferencesActionState: UserPreferencesActionState = {
  status: "idle",
  message: null,
  uiLocale: null,
};
