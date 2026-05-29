import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    exchangeCodeForSession,
  },
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges the OAuth code and redirects to the protected app", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(new NextRequest("https://calm-ledger.example/auth/callback?code=oauth-code"));

    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(response.headers.get("location")).toBe("https://calm-ledger.example/assistant");
  });

  it("keeps callback failures on the friendly sign-in error path", async () => {
    const { GET } = await import("@/app/auth/callback/route");

    const response = await GET(new NextRequest("https://calm-ledger.example/auth/callback?error=access_denied"));

    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://calm-ledger.example/sign-in?error=We+couldn%27t+complete+your+sign-in.+Please+try+again.",
    );
  });
});
