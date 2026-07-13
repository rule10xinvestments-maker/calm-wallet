import { beforeEach, describe, expect, it, vi } from "vitest";

const createSupabaseAdminClient = vi.fn();
const createSupabaseServerClient = vi.fn();

vi.mock("@/lib/server/supabase-admin", () => ({
  createSupabaseAdminClient,
}));

vi.mock("@/lib/auth/server-client", () => ({
  createSupabaseServerClient,
}));

describe("admin support service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSupabaseServerClient.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn(async () => ({ data: { user_id: "admin-1" }, error: null })),
          }),
        }),
      }),
    });
  });

  it("grants one-year Unlimited through the existing credit account entitlement", async () => {
    const admin = makeAdminClient();
    createSupabaseAdminClient.mockReturnValue(admin.client);
    const { setAdminUnlimited } = await import("@/domain/admin-support/service");

    await setAdminUnlimited({
      targetUserId: "user-1",
      actingAdminId: "admin-1",
      reasonCategory: "testing",
      internalNote: "QA",
      operationKey: "admin-unlimited:test",
      mode: "grant_one_year",
    });

    expect(admin.rpc).toHaveBeenCalledWith("ensure_credit_account", { p_user_id: "user-1" });
    expect(admin.creditAccounts.update).toHaveBeenCalledWith({ unlimited_until: expect.any(String) });
    expect(admin.creditLedger.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "user-1",
      delta: 0,
      reason: "unlimited_started",
      operation_key: "admin-unlimited:test",
    }));
    expect(admin.adminCreditActions.upsert).toHaveBeenCalledWith(expect.objectContaining({
      action_type: "unlimited_grant",
      operation_key: "admin-unlimited:test",
    }), { onConflict: "operation_key", ignoreDuplicates: true });
  });

  it("removes Unlimited by clearing the existing entitlement field", async () => {
    const admin = makeAdminClient();
    createSupabaseAdminClient.mockReturnValue(admin.client);
    const { setAdminUnlimited } = await import("@/domain/admin-support/service");

    await setAdminUnlimited({
      targetUserId: "user-1",
      actingAdminId: "admin-1",
      reasonCategory: "support_correction",
      internalNote: null,
      operationKey: "admin-unlimited:remove",
      mode: "remove",
    });

    expect(admin.creditAccounts.update).toHaveBeenCalledWith({ unlimited_until: null });
    expect(admin.adminCreditActions.upsert).toHaveBeenCalledWith(expect.objectContaining({
      action_type: "unlimited_remove",
      unlimited_until_after: null,
    }), { onConflict: "operation_key", ignoreDuplicates: true });
  });

  it("does not duplicate an Unlimited operation when the audit action already exists", async () => {
    const admin = makeAdminClient({ existingAction: { id: "action-1" } });
    createSupabaseAdminClient.mockReturnValue(admin.client);
    const { setAdminUnlimited } = await import("@/domain/admin-support/service");

    await setAdminUnlimited({
      targetUserId: "user-1",
      actingAdminId: "admin-1",
      reasonCategory: "testing",
      internalNote: null,
      operationKey: "admin-unlimited:duplicate",
      mode: "grant_one_year",
    });

    expect(admin.creditAccounts.update).not.toHaveBeenCalled();
    expect(admin.creditLedger.insert).not.toHaveBeenCalled();
  });

  it("fails explicitly when the Unlimited audit write fails", async () => {
    const admin = makeAdminClient({ auditError: { message: "audit failed" } });
    createSupabaseAdminClient.mockReturnValue(admin.client);
    const { setAdminUnlimited } = await import("@/domain/admin-support/service");

    await expect(setAdminUnlimited({
      targetUserId: "user-1",
      actingAdminId: "admin-1",
      reasonCategory: "testing",
      internalNote: null,
      operationKey: "admin-unlimited:audit-fails",
      mode: "grant_one_year",
    })).rejects.toThrow("unlimited_audit_failed");
  });
});

function makeAdminClient(options: {
  existingAction?: { id: string } | null;
  existingLedger?: { id: string } | null;
  auditError?: { message: string } | null;
} = {}) {
  const rpc = vi.fn(async () => ({ data: {}, error: null }));
  const adminCreditActions = {
    upsert: vi.fn(async () => ({ data: null, error: options.auditError ?? null })),
  };
  const creditLedger = {
    insert: vi.fn(async () => ({ data: null, error: null })),
  };
  const creditAccounts = {
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ data: null, error: null })),
    })),
  };

  const client = {
    rpc,
    from: vi.fn((table: string) => {
      if (table === "admin_credit_actions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn(async () => ({ data: options.existingAction ?? null, error: null })),
            }),
          }),
          upsert: adminCreditActions.upsert,
        };
      }

      if (table === "credit_ledger") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn(async () => ({ data: options.existingLedger ?? null, error: null })),
            }),
          }),
          insert: creditLedger.insert,
        };
      }

      if (table === "credit_accounts") {
        return {
          select: () => ({
            eq: () => ({
              single: vi.fn(async () => ({
                data: { unlimited_until: "2026-07-14T00:00:00.000Z", credit_balance: 12 },
                error: null,
              })),
            }),
          }),
          update: creditAccounts.update,
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };

  return { client, rpc, adminCreditActions, creditLedger, creditAccounts };
}
