import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const getUser = vi.fn();
const createSupabaseServerClient = vi.fn(async () => ({
  auth: {
    getSession,
    getUser,
  },
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("auth session loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
