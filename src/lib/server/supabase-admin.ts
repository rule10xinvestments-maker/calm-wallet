import { createClient } from "@supabase/supabase-js";

export type SupabaseAdminClientResult =
  | { ok: true; client: unknown }
  | { ok: false; reason: "admin_unconfigured" | "admin_invalid_config" };

export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch {
    return null;
  }
}

export function createSupabaseAdminClientResult(): SupabaseAdminClientResult {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, reason: "admin_unconfigured" };
  }

  try {
    return {
      ok: true,
      client: createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }),
    };
  } catch {
    return { ok: false, reason: "admin_invalid_config" };
  }
}
