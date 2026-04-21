import { AUTH_REDIRECT_PATH, AUTH_SIGN_IN_PATH } from "@/lib/auth/shared";

const AUTH_ERROR_MESSAGE = "We couldn't complete your sign-in. Please try again.";

export function getSafeNextPath(next: string | null | undefined) {
  if (!next) {
    return null;
  }

  const trimmed = next.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  if (trimmed.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function resolvePostAuthRedirect(next: string | null | undefined) {
  return getSafeNextPath(next) ?? AUTH_REDIRECT_PATH;
}

export function buildSignInRedirectUrl(args?: { next?: string | null; error?: string | null }) {
  const params = new URLSearchParams();
  const safeNext = getSafeNextPath(args?.next);

  if (safeNext) {
    params.set("next", safeNext);
  }

  if (args?.error) {
    params.set("error", args.error);
  }

  return params.size ? `${AUTH_SIGN_IN_PATH}?${params.toString()}` : AUTH_SIGN_IN_PATH;
}

export function getAuthCallbackErrorMessage() {
  return AUTH_ERROR_MESSAGE;
}
