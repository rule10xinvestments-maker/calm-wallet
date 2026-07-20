export const NATIVE_GOOGLE_OAUTH_CALLBACK_URL = "com.calmwallet.app://auth/callback";
export const NATIVE_GOOGLE_OAUTH_NEXT_STORAGE_KEY = "calm-wallet-native-oauth-next";

export function buildGoogleOAuthRedirectTo(args: { isNativeShell: boolean; nextPath?: string | null; origin: string }) {
  if (!args.isNativeShell) {
    return new URL("/auth/callback", args.origin).toString();
  }

  return NATIVE_GOOGLE_OAUTH_CALLBACK_URL;
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
      return NATIVE_GOOGLE_OAUTH_CALLBACK_URL;
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
