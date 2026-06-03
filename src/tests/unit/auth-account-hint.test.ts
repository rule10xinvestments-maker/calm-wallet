import { describe, expect, it } from "vitest";
import { getAccountHint } from "@/lib/auth/account-hint";

describe("getAccountHint", () => {
  it("prefers a trimmed email address", () => {
    expect(getAccountHint({ email: " user@example.com ", id: "1234567890" })).toBe("user@example.com");
  });

  it("falls back to a short account id", () => {
    expect(getAccountHint({ email: null, id: "1234567890abcdef" })).toBe("account 12345678");
  });

  it("does not throw for missing or malformed auth user fields", () => {
    expect(getAccountHint(null)).toBe("account unknown");
    expect(getAccountHint(undefined)).toBe("account unknown");
    expect(getAccountHint({ email: "", id: "" })).toBe("account unknown");
  });
});
