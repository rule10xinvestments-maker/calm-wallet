"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseUserPreferencesService } from "@/domain/preferences/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { normalizeLocale, supportedLocales, type SupportedLocale } from "@/lib/i18n";
import {
  initialUserPreferencesActionState,
  type UserPreferencesActionState,
} from "@/lib/actions/preferences-state";

function parseLocale(value: FormDataEntryValue | null): SupportedLocale | null {
  const normalized = normalizeLocale(typeof value === "string" ? value : null);
  const raw = typeof value === "string" ? value.trim().toLowerCase().split(/[-_]/)[0] : "";
  return supportedLocales.includes(raw as SupportedLocale) ? normalized : null;
}

export async function updateUserPreferencesAction(
  _prevState: UserPreferencesActionState,
  formData: FormData,
): Promise<UserPreferencesActionState> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialUserPreferencesActionState,
      status: "error",
      message: "Authenticated user is required.",
    };
  }

  const uiLocale = parseLocale(formData.get("uiLocale"));

  if (!uiLocale) {
    return {
      ...initialUserPreferencesActionState,
      status: "error",
      message: "Language could not be saved.",
    };
  }

  try {
    const service = await createSupabaseUserPreferencesService();
    const preferences = await service.updateUserPreferences(user.id, { uiLocale });

    revalidatePath("/assistant");
    revalidatePath("/transactions");
    revalidatePath("/insights");

    return {
      status: "success",
      message: "Language saved.",
      uiLocale: preferences.uiLocale,
    };
  } catch {
    return {
      ...initialUserPreferencesActionState,
      status: "error",
      message: "Language could not be saved.",
    };
  }
}

export async function updateUserTimezoneAction(timezone: string): Promise<void> {
  const auth = await requireAuthenticatedSession();
  const user = auth.user;

  if (!user) {
    return;
  }

  try {
    const service = await createSupabaseUserPreferencesService();
    await service.updateUserTimezone(user.id, { timezone });
  } catch {
    // Timezone sync is best effort; reminders can still fall back safely.
  }
}
