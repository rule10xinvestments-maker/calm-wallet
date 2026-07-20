import { describe, expect, it, vi } from "vitest";
import capacitorConfig from "../../../capacitor.config";

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
});
