import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { buildSignInRedirectUrl } from "@/lib/auth/redirects";
import { getAuthSession } from "@/lib/auth/session";
import { AUTH_REDIRECT_PATH } from "@/lib/auth/shared";

export async function requireAuthenticatedSession() {
  const auth = await getAuthSession();

  if (!auth.user) {
    const headerStore = await headers();
    const next = headerStore.get("x-auth-next");
    redirect(buildSignInRedirectUrl({ next }));
  }

  return auth;
}

export async function redirectIfAuthenticated() {
  const auth = await getAuthSession();

  if (auth.user) {
    redirect(AUTH_REDIRECT_PATH);
  }

  return auth;
}
