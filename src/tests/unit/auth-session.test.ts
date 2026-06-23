import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getUser = vi.fn();
const headerGet = vi.fn();
const headers = vi.fn(async () => ({
  get: headerGet,
}));
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    getSession,
    getUser,
  },
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

vi.mock("next/headers", () => ({
  headers,
}));

describe("auth session loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headerGet.mockReturnValue(null);
  });

  it("uses the middleware-verified user without calling Supabase Auth again", async () => {
    headerGet.mockImplementation((name: string) => {
      const values: Record<string, string> = {
        "x-auth-verified": "middleware",
        "x-auth-user-id": "user-1",
        "x-auth-user-email": "user@example.com",
      };

      return values[name] ?? null;
    });
    const { getAuthSession } = await import("@/lib/auth/session");

    const result = await getAuthSession();

    expect(result.user?.id).toBe("user-1");
    expect(result.user?.email).toBe("user@example.com");
    expect(result.session).toBeNull();
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("loads the authenticated user without an extra session request", async () => {
    getUser.mockResolvedValueOnce({
      data: {
        user: {
          id: "user-1",
          email: "user@example.com",
        },
      },
      error: null,
    });
    const { getAuthSession } = await import("@/lib/auth/session");

    const result = await getAuthSession();

    expect(result.user?.id).toBe("user-1");
    expect(result.session).toBeNull();
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("uses the server session when the user check is temporarily unavailable", async () => {
    const session = {
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-1",
        email: "user@example.com",
      },
    };
    getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: new Error("Auth session is temporarily unavailable."),
    });
    getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    });
    const { getAuthSession } = await import("@/lib/auth/session");

    const result = await getAuthSession();

    expect(result.user?.id).toBe("user-1");
    expect(result.session).toBe(session);
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("uses the server session when a rapid protected navigation sees a transient null user", async () => {
    const session = {
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "user-2",
        email: "other@example.com",
      },
    };
    getUser.mockResolvedValueOnce({
      data: {
        user: null,
      },
      error: null,
    });
    getSession.mockResolvedValueOnce({
      data: {
        session,
      },
      error: null,
    });
    const { getAuthSession } = await import("@/lib/auth/session");

    const result = await getAuthSession();

    expect(result.user?.id).toBe("user-2");
    expect(result.session).toBe(session);
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).toHaveBeenCalledOnce();
  });

  it("returns no user when both the user and session checks are unauthenticated", async () => {
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
    const { getAuthSession } = await import("@/lib/auth/session");

    const result = await getAuthSession();

    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
    expect(getUser).toHaveBeenCalledOnce();
    expect(getSession).toHaveBeenCalledOnce();
  });
});
