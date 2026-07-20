import { describe, expect, it } from "vitest";
import { buildGoogleOAuthRedirectTo, resolveAllowedGoogleOAuthRedirectTo } from "@/lib/auth/oauth-redirect";

describe("Google OAuth redirect selection", () => {
  it("selects the custom-scheme callback for the Android native shell", () => {
    expect(
      buildGoogleOAuthRedirectTo({
        isNativeShell: true,
        nextPath: "/assistant",
        origin: "https://calm-wallet.vercel.app",
      }),
    ).toBe("com.calmwallet.app://auth/callback");
  });

  it("selects the HTTPS callback for web and PWA surfaces", () => {
    expect(
      buildGoogleOAuthRedirectTo({
        isNativeShell: false,
        nextPath: "/assistant",
        origin: "https://calm-wallet.vercel.app",
      }),
    ).toBe("https://calm-wallet.vercel.app/auth/callback");
  });

  it("accepts only the exact native callback shape", () => {
    expect(
      resolveAllowedGoogleOAuthRedirectTo({
        requestedRedirectTo: "com.calmwallet.app://auth/callback?next=%2Finsights",
        siteUrl: "https://calm-wallet.vercel.app",
      }),
    ).toBe("com.calmwallet.app://auth/callback");

    expect(
      resolveAllowedGoogleOAuthRedirectTo({
        requestedRedirectTo: "com.calmwallet.app://wrong/callback?next=%2Finsights",
        siteUrl: "https://calm-wallet.vercel.app",
      }),
    ).toBe("https://calm-wallet.vercel.app/auth/callback");
  });

  it("accepts the production HTTPS callback and strips unexpected query values", () => {
    expect(
      resolveAllowedGoogleOAuthRedirectTo({
        requestedRedirectTo: "https://calm-wallet.vercel.app/auth/callback?next=https%3A%2F%2Fevil.example",
        siteUrl: "https://calm-wallet.vercel.app",
      }),
    ).toBe("https://calm-wallet.vercel.app/auth/callback");
  });
});
