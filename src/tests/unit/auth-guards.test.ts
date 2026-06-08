import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthSession = vi.fn();
const headerGet = vi.fn();
const headers = vi.fn(async () => ({
  get: headerGet,
}));
const redirect = vi.fn((url: string) => {
  throw new Error(`redirect:${url}`);
});

vi.mock("next/headers", () => ({
  headers,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSession,
}));

describe("auth guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headerGet.mockReturnValue("/insights");
  });

  it("keeps protected navigation signed in when the session fallback recovered the user", async () => {
    const auth = {
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
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    };
    getAuthSession.mockResolvedValueOnce(auth);
    const { requireAuthenticatedSession } = await import("@/lib/auth/guards");

    const result = await requireAuthenticatedSession();

    expect(result).toBe(auth);
    expect(redirect).not.toHaveBeenCalled();
    expect(headers).not.toHaveBeenCalled();
  });

  it("still redirects truly unauthenticated protected requests to sign in", async () => {
    getAuthSession.mockResolvedValueOnce({
      session: null,
      user: null,
    });
    const { requireAuthenticatedSession } = await import("@/lib/auth/guards");

    await expect(requireAuthenticatedSession()).rejects.toThrow("redirect:/sign-in?next=%2Finsights");

    expect(headers).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/sign-in?next=%2Finsights");
  });
});
