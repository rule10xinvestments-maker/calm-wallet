import { beforeEach, describe, expect, it, vi } from "vitest";

const adminClient = vi.hoisted(() => ({ current: null as unknown }));
const serverClient = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/server/supabase-admin", () => ({
  createSupabaseAdminClient: () => adminClient.current,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient: async () => serverClient.current,
}));

vi.mock("@/lib/auth/shared", () => ({
  getRequiredEnv: () => "https://calm-wallet.example",
}));

function chain(result: unknown) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    gte: vi.fn(() => api),
    insert: vi.fn(() => api),
    update: vi.fn(() => api),
    single: vi.fn(async () => result),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return api;
}

function createAdminMock(options: {
  recentCount?: number;
  supportPaths?: string[];
  importPaths?: string[];
  rpcError?: boolean;
  storageError?: boolean;
  authError?: boolean;
} = {}) {
  const chains: Record<string, ReturnType<typeof chain>[]> = {};
  const inserts: Array<{ table: string; row: unknown }> = [];
  const updates: Array<{ table: string; row: unknown }> = [];
  const storageRemove = vi.fn(async () => ({ error: options.storageError ? { message: "storage failed" } : null }));
  const from = vi.fn((table: string) => {
    if (table === "account_deletion_requests") {
      const requestInsert = {
        select: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: {
              id: "request-1",
              user_id: "user-1",
              email_hash: "hash",
              source: "in_app",
              status: "verified",
              requested_at: "2026-07-14T00:00:00.000Z",
            },
            error: null,
          })),
        })),
      };
      const api = {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(async () => ({ count: options.recentCount ?? 0, error: null })),
            })),
          })),
        })),
        insert: vi.fn((row: unknown) => {
          inserts.push({ table, row });
          return requestInsert;
        }),
        update: vi.fn((row: unknown) => {
          updates.push({ table, row });
          return { eq: vi.fn(async () => ({ error: null })) };
        }),
      };
      return api;
    }

    const rows =
      table === "support_ticket_attachments"
        ? (options.supportPaths ?? []).map((storage_path) => ({ storage_path }))
        : (options.importPaths ?? []).map((storage_path) => ({ storage_path }));
    const tableChain = chain({ data: rows, error: null });
    chains[table] = [...(chains[table] ?? []), tableChain];
    return tableChain;
  });

  return {
    from,
    inserts,
    updates,
    rpc: vi.fn(async () => ({ data: { ok: true }, error: options.rpcError ? { message: "rpc failed" } : null })),
    storage: { from: vi.fn(() => ({ remove: storageRemove })) },
    storageRemove,
    auth: {
      admin: {
        deleteUser: vi.fn(async () => ({ data: {}, error: options.authError ? { message: "auth failed" } : null })),
      },
    },
  };
}

describe("account deletion service", () => {
  beforeEach(() => {
    vi.resetModules();
    adminClient.current = null;
    serverClient.current = null;
  });

  it("normalizes and hashes identifiers without retaining the plain email", async () => {
    const { normalizeDeletionEmail, hashDeletionIdentifier } = await import("@/domain/account-deletion/service");

    expect(normalizeDeletionEmail(" User@Example.COM ")).toBe("user@example.com");
    expect(hashDeletionIdentifier("user@example.com")).toHaveLength(64);
    expect(hashDeletionIdentifier("user@example.com")).not.toContain("user@example.com");
  });

  it("requests public verification without revealing whether the email exists", async () => {
    const admin = createAdminMock();
    const signInWithOtp = vi.fn(async () => ({ error: { message: "not found" } }));
    adminClient.current = admin;
    serverClient.current = { auth: { signInWithOtp } };
    const { requestPublicDeletionVerification } = await import("@/domain/account-deletion/service");

    await expect(requestPublicDeletionVerification({ email: "missing@example.com", ipAddress: "127.0.0.1" })).resolves.toBeUndefined();

    expect(admin.inserts[0]?.table).toBe("account_deletion_requests");
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "missing@example.com",
      options: expect.objectContaining({
        shouldCreateUser: false,
        emailRedirectTo: expect.stringContaining("/auth/callback?next=%2Fdelete-account%3Fverified%3D1"),
      }),
    });
  });

  it("rate-limits repeated public deletion link requests without sending another OTP", async () => {
    const admin = createAdminMock({ recentCount: 3 });
    const signInWithOtp = vi.fn();
    adminClient.current = admin;
    serverClient.current = { auth: { signInWithOtp } };
    const { requestPublicDeletionVerification } = await import("@/domain/account-deletion/service");

    await requestPublicDeletionVerification({ email: "user@example.com", ipAddress: "127.0.0.1" });

    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(admin.inserts.some((entry) => JSON.stringify(entry.row).includes("rate_limited"))).toBe(true);
  });

  it("executes database cleanup, storage cleanup, and auth deletion in a server-controlled flow", async () => {
    const admin = createAdminMock({
      supportPaths: ["user-1/ticket/file.png"],
      importPaths: ["user-1/import.csv"],
    });
    adminClient.current = admin;
    const { executeAccountDeletion } = await import("@/domain/account-deletion/service");

    await expect(executeAccountDeletion({ userId: "user-1", email: "user@example.com", source: "in_app" })).resolves.toEqual({
      requestId: "request-1",
      status: "completed",
    });

    expect(admin.rpc).toHaveBeenCalledWith("cleanup_account_for_deletion", {
      p_request_id: "request-1",
      p_user_id: "user-1",
    });
    expect(admin.storage.from).toHaveBeenCalledWith("support-attachments");
    expect(admin.storage.from).toHaveBeenCalledWith("staged-imports");
    expect(admin.storageRemove).toHaveBeenCalledWith(["user-1/ticket/file.png"]);
    expect(admin.storageRemove).toHaveBeenCalledWith(["user-1/import.csv"]);
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(admin.updates.some((entry) => JSON.stringify(entry.row).includes("completed"))).toBe(true);
  });

  it("marks the request failed when storage cleanup fails before auth deletion", async () => {
    const admin = createAdminMock({
      supportPaths: ["user-1/ticket/file.png"],
      storageError: true,
    });
    adminClient.current = admin;
    const { executeAccountDeletion } = await import("@/domain/account-deletion/service");

    await expect(executeAccountDeletion({ userId: "user-1", email: "user@example.com", source: "web" })).rejects.toThrow(
      "storage_cleanup_failed",
    );

    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(admin.updates.some((entry) => JSON.stringify(entry.row).includes("storage_cleanup_failed"))).toBe(true);
  });

  it("marks the request failed when Auth account deletion fails", async () => {
    const admin = createAdminMock({ authError: true });
    adminClient.current = admin;
    const { executeAccountDeletion } = await import("@/domain/account-deletion/service");

    await expect(executeAccountDeletion({ userId: "user-1", email: "user@example.com", source: "in_app" })).rejects.toThrow(
      "auth_delete_failed",
    );

    expect(admin.rpc).toHaveBeenCalled();
    expect(admin.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(admin.updates.some((entry) => JSON.stringify(entry.row).includes("auth_delete_failed"))).toBe(true);
  });
});
