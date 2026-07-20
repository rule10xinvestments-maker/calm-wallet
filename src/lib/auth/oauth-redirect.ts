import { resolvePostAuthRedirect } from "@/lib/auth/redirects";

export const NATIVE_GOOGLE_OAUTH_CALLBACK_URL = "com.calmwallet.app://auth/callback";

export function buildGoogleOAuthRedirectTo(args: { isNativeShell: boolean; nextPath?: string | null; origin: string }) {
  if (!args.isNativeShell) {
    return new URL("/auth/callback", args.origin).toString();
  }

  const callbackUrl = new URL(NATIVE_GOOGLE_OAUTH_CALLBACK_URL);
  callbackUrl.searchParams.set("next", resolvePostAuthRedirect(args.nextPath ?? null));
  return callbackUrl.toString();
}

export function resolveAllowedGoogleOAuthRedirectTo(args: {
  fallbackNext?: string | null;
  requestedRedirectTo?: string | null;
  siteUrl: string;
}) {
  const webCallbackUrl = new URL("/auth/callback", args.siteUrl).toString();

  if (!args.requestedRedirectTo) {
    return webCallbackUrl;
  }

  try {
    const requestedUrl = new URL(args.requestedRedirectTo);

    if (
      requestedUrl.protocol === "com.calmwallet.app:" &&
      requestedUrl.hostname === "auth" &&
      requestedUrl.pathname === "/callback"
    ) {
      const callbackUrl = new URL(NATIVE_GOOGLE_OAUTH_CALLBACK_URL);
      callbackUrl.searchParams.set("next", resolvePostAuthRedirect(requestedUrl.searchParams.get("next") ?? args.fallbackNext ?? null));
      return callbackUrl.toString();
    }

    const allowedWebUrl = new URL(webCallbackUrl);
    if (
      requestedUrl.protocol === allowedWebUrl.protocol &&
      requestedUrl.hostname === allowedWebUrl.hostname &&
      requestedUrl.pathname === allowedWebUrl.pathname
    ) {
      return webCallbackUrl;
    }
  } catch {
    return webCallbackUrl;
  }

  return webCallbackUrl;
}
