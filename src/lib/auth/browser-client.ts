"use client";

import { createBrowserClient } from "@supabase/ssr";

function getRequiredPublicSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing required public Supabase URL.");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing required public Supabase anon key.");
  }

  return { supabaseAnonKey, supabaseUrl };
}

export function createSupabaseBrowserClient() {
  const { supabaseAnonKey, supabaseUrl } = getRequiredPublicSupabaseEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
