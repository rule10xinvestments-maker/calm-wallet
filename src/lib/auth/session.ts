import { cache } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

export type AuthSessionResult = {
  session: Session | null;
  user: User | null;
};

export const getAuthSession = cache(async (): Promise<AuthSessionResult> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) {
    return {
      session: null,
      user,
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    return {
      session,
      user: session.user,
    };
  }

  return {
    session: null,
    user: null,
  };
});

export async function getCurrentUser() {
  const { user } = await getAuthSession();
  return user;
}

export async function isAuthenticated() {
  const { user } = await getAuthSession();
  return Boolean(user);
}
