import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getSession = vi.fn();
const getUser = vi.fn();
const createServerClient = vi.fn(() => ({
  auth: {
    getSession,
    getUser,
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

describe("auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("does not redirect protected navigation when a transient null user still has a session", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });
    getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "user-1",
            email: "user@example.com",
          },
        },
      },
      error: null,
    });
    const { middleware } = await import("../../../middleware");

    const response = await middleware(new NextRequest("https://calm-wallet.example/assistant"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-auth-verified")).toBe("middleware");
    expect(response.headers.get("x-middleware-request-x-auth-user-id")).toBe("user-1");
    expect(response.headers.get("x-middleware-request-x-auth-user-email")).toBe("user@example.com");
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("still redirects protected navigation when no user or session exists", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });
    getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
      error: null,
    });
    const { middleware } = await import("../../../middleware");

    const response = await middleware(new NextRequest("https://calm-wallet.example/insights?chart=mix"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://calm-wallet.example/sign-in?next=%2Finsights%3Fchart%3Dmix",
    );
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).toHaveBeenCalledOnce();
  });
});
