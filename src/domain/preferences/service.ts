import { updateUserPreferencesSchema } from "@/domain/preferences/schemas";
import type { UserPreferences, UserPreferencesRow } from "@/domain/preferences/types";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

type QueryResult<T> = Promise<{ data: T | null; error: unknown }>;

type UserPreferencesAdapter = {
  getPreferences(userId: string): QueryResult<UserPreferencesRow>;
  insertPreferences(userId: string, uiLocale: SupportedLocale): QueryResult<UserPreferencesRow>;
  updatePreferences(userId: string, uiLocale: SupportedLocale): QueryResult<UserPreferencesRow>;
};

function assertResult<T>(result: { data: T | null; error: unknown }, fallbackMessage: string) {
  if (result.error || !result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function mapPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    userId: row.id,
    uiLocale: row.ui_locale ? normalizeLocale(row.ui_locale) : null,
  };
}

export function createUserPreferencesService(adapter: UserPreferencesAdapter) {
  return {
    async getUserPreferences(userId: string): Promise<UserPreferences> {
      const result = await adapter.getPreferences(userId);

      if (result.data) {
        return mapPreferences(result.data);
      }

      const created = assertResult(await adapter.insertPreferences(userId, "en"), "Unable to create user preferences.");
      return mapPreferences(created);
    },

    async updateUserPreferences(userId: string, input: { uiLocale: SupportedLocale }): Promise<UserPreferences> {
      const parsed = updateUserPreferencesSchema.parse(input);
      const row = assertResult(
        await adapter.updatePreferences(userId, parsed.uiLocale),
        "Unable to update user preferences.",
      );

      return mapPreferences(row);
    },
  };
}

export async function createSupabaseUserPreferencesService() {
  const supabase = await createSupabaseServerClient();

  return createUserPreferencesService({
    async getPreferences(userId) {
      return supabase.from("profiles").select("id,ui_locale").eq("id", userId).maybeSingle();
    },
    async insertPreferences(userId, uiLocale) {
      return supabase.from("profiles").insert({ id: userId, ui_locale: uiLocale }).select("id,ui_locale").single();
    },
    async updatePreferences(userId, uiLocale) {
      return supabase.from("profiles").update({ ui_locale: uiLocale }).eq("id", userId).select("id,ui_locale").single();
    },
  });
}
