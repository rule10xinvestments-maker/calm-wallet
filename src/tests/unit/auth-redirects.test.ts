import { describe, expect, it } from "vitest";
import {
  buildSignInRedirectUrl,
  getAuthCallbackErrorMessage,
  getSafeNextPath,
  resolvePostAuthRedirect,
} from "@/lib/auth/redirects";

describe("auth redirect helpers", () => {
  it("allows relative internal next paths", () => {
    expect(getSafeNextPath("/transactions?view=needs-review")).toBe("/transactions?view=needs-review");
    expect(getSafeNextPath("/assistant#composer")).toBe("/assistant#composer");
  });

  it("rejects unsafe next values", () => {
    expect(getSafeNextPath("https://evil.example")).toBeNull();
    expect(getSafeNextPath("//evil.example")).toBeNull();
    expect(getSafeNextPath("javascript:alert(1)")).toBeNull();
    expect(getSafeNextPath(" assistant ")).toBeNull();
  });

  it("falls back to /assistant when next is missing or unsafe", () => {
    expect(resolvePostAuthRedirect(null)).toBe("/assistant");
    expect(resolvePostAuthRedirect("https://evil.example")).toBe("/assistant");
  });

  it("builds sign-in redirects with safe next values only", () => {
    expect(buildSignInRedirectUrl({ next: "/transactions?view=all" })).toBe(
      "/sign-in?next=%2Ftransactions%3Fview%3Dall",
    );
    expect(buildSignInRedirectUrl({ next: "https://evil.example" })).toBe("/sign-in");
  });

  it("includes callback error messaging when provided", () => {
    expect(buildSignInRedirectUrl({ error: getAuthCallbackErrorMessage() })).toBe(
      "/sign-in?error=We+couldn%27t+complete+your+sign-in.+Please+try+again.",
    );
  });
});
