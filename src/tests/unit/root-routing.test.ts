import { describe, expect, it, vi } from "vitest";
import capacitorConfig from "../../../capacitor.config";
import { getCapacitorNavigationIntent, getNativeAuthCallbackPath } from "@/components/capacitor-shell-runtime";

const redirect = vi.fn((path: string) => {
  throw new Error(`redirect:${path}`);
});

vi.mock("next/navigation", () => ({
  redirect,
}));

describe("root routing", () => {
  it("redirects the site root to the protected Assistant entry route", async () => {
    const { default: RootPage } = await import("@/app/page");

    expect(() => RootPage()).toThrow("redirect:/assistant");
    expect(redirect).toHaveBeenCalledWith("/assistant");
  });

  it("keeps the Android shell on the HTTPS Calm Wallet production host", () => {
    expect(capacitorConfig.server).toMatchObject({
      url: "https://calm-wallet.vercel.app",
      cleartext: false,
      allowNavigation: ["calm-wallet.vercel.app"],
    });
  });

  it("keeps same-origin absolute Calm Wallet URLs inside the native shell", () => {
    expect(
      getCapacitorNavigationIntent("https://calm-wallet.vercel.app/insights", "https://calm-wallet.vercel.app/assistant"),
    ).toBe("internal");
  });

  it("keeps relative Calm Wallet URLs inside the native shell", () => {
    expect(getCapacitorNavigationIntent("/transactions", "https://calm-wallet.vercel.app/assistant")).toBe("internal");
  });

  it("opens external web domains through the Capacitor Browser", () => {
    expect(getCapacitorNavigationIntent("https://example.com/help", "https://calm-wallet.vercel.app/assistant")).toBe(
      "external-http",
    );
  });

  it("leaves mail and telephone links to the system handler", () => {
    expect(getCapacitorNavigationIntent("mailto:support@example.test", "https://calm-wallet.vercel.app/assistant")).toBe(
      "system",
    );
    expect(getCapacitorNavigationIntent("tel:+40123456789", "https://calm-wallet.vercel.app/assistant")).toBe("system");
  });

  it("maps native OAuth callbacks back to the hosted app callback route", () => {
    expect(getNativeAuthCallbackPath("com.calmwallet.app://auth/callback?code=oauth-code&next=%2Fassistant")).toBe(
      "/auth/callback?code=oauth-code&next=%2Fassistant",
    );
    expect(getNativeAuthCallbackPath("https://calm-wallet.vercel.app/auth/callback?code=oauth-code")).toBeNull();
  });
});
