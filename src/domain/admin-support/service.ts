import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

export const adminCreditReasonCategories = [
  "giveaway",
  "promotion",
  "support_correction",
  "testing",
  "billing_correction",
  "other",
] as const;

export type AdminCreditReasonCategory = (typeof adminCreditReasonCategories)[number];

export type AdminDashboardSummary = {
  totalUsers: number;
  activeToday: number;
  active7Days: number;
  active30Days: number;
  activeUnlimitedUsers: number;
  refreshedAt: string;
};

export type AdminCreditLedgerEvent = {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
  metadata: unknown;
};

export type AdminUserCreditLookup = {
  userId: string;
  email: string;
  creditBalance: number;
  recurringGraceDebt: number;
  unlimitedUntil: string | null;
  unlimitedActive: boolean;
  recentLedgerEvents: AdminCreditLedgerEvent[];
};

type UntypedSupabase = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    admin: {
      listUsers: (args?: { page?: number; perPage?: number }) => Promise<{
        data: { users: Array<{ id: string; email?: string | null }> };
        error: { message?: string } | null;
      }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isActiveUnlimited(unlimitedUntil: string | null) {
  return Boolean(unlimitedUntil && new Date(unlimitedUntil).getTime() > Date.now());
}

function requireAdminClient() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("admin_unavailable");
  }
  return client as UntypedSupabase;
}

export async function assertSupportAdmin(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();

  if (error || !data) {
    throw new Error("admin_forbidden");
  }
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const admin = requireAdminClient();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const sevenDaysIso = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const thirtyDaysIso = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [totalUsers, activeToday, active7Days, active30Days, activeUnlimitedUsers] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("last_active_on", todayIso),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_on", sevenDaysIso),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_active_on", thirtyDaysIso),
    admin.from("credit_accounts").select("user_id", { count: "exact", head: true }).gt("unlimited_until", new Date().toISOString()),
  ]);

  const queries = [totalUsers, activeToday, active7Days, active30Days, activeUnlimitedUsers];
  if (queries.some((query) => query.error)) {
    throw new Error("dashboard_unavailable");
  }

  return {
    totalUsers: totalUsers.count ?? 0,
    activeToday: activeToday.count ?? 0,
    active7Days: active7Days.count ?? 0,
    active30Days: active30Days.count ?? 0,
    activeUnlimitedUsers: activeUnlimitedUsers.count ?? 0,
    refreshedAt: new Date().toISOString(),
  };
}

export async function findAdminUserByExactEmail(rawEmail: string): Promise<AdminUserCreditLookup | null> {
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes("@")) {
    return null;
  }

  const admin = requireAdminClient();
  let matchedUser: { id: string; email?: string | null } | null = null;

  for (let page = 1; page <= 100 && !matchedUser; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) {
      throw new Error("user_lookup_unavailable");
    }

    matchedUser = data.users.find((user) => normalizeEmail(user.email ?? "") === email) ?? null;
    if (data.users.length < 100) {
      break;
    }
  }

  if (!matchedUser?.id) {
    return null;
  }

  await admin.rpc("ensure_credit_account", { p_user_id: matchedUser.id });

  const [accountResult, ledgerResult] = await Promise.all([
    admin.from("credit_accounts").select("*").eq("user_id", matchedUser.id).single(),
    admin.from("credit_ledger").select("*").eq("user_id", matchedUser.id).order("created_at", { ascending: false }).limit(8),
  ]);

  if (accountResult.error || !accountResult.data || ledgerResult.error) {
    throw new Error("user_lookup_unavailable");
  }

  const account = accountResult.data as {
    credit_balance: number;
    recurring_grace_debt: number;
    unlimited_until: string | null;
  };

  return {
    userId: matchedUser.id,
    email: matchedUser.email ?? email,
    creditBalance: account.credit_balance,
    recurringGraceDebt: account.recurring_grace_debt,
    unlimitedUntil: account.unlimited_until,
    unlimitedActive: isActiveUnlimited(account.unlimited_until),
    recentLedgerEvents: ((ledgerResult.data ?? []) as Array<{
      id: string;
      delta: number;
      balance_after: number;
      reason: string;
      created_at: string;
      metadata: unknown;
    }>).map((event) => ({
      id: event.id,
      delta: event.delta,
      balanceAfter: event.balance_after,
      reason: event.reason,
      createdAt: event.created_at,
      metadata: event.metadata,
    })),
  };
}

export async function grantAdminCredits(args: {
  targetUserId: string;
  actingAdminId: string;
  amount: number;
  reasonCategory: AdminCreditReasonCategory;
  internalNote: string | null;
  operationKey: string;
}) {
  const admin = requireAdminClient();
  const metadata = {
    source: "admin_support",
    acting_admin_id: args.actingAdminId,
    reason_category: args.reasonCategory,
    internal_note: args.internalNote,
  };

  const { data, error } = await admin.rpc("add_entry_credits", {
    p_user_id: args.targetUserId,
    p_delta: args.amount,
    p_reason: "admin_adjustment",
    p_operation_key: args.operationKey,
    p_external_reference: null,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error("credit_grant_failed");
  }

  await admin.from("admin_credit_actions").upsert({
    target_user_id: args.targetUserId,
    acting_admin_id: args.actingAdminId,
    action_type: "credit_grant",
    amount: args.amount,
    reason_category: args.reasonCategory,
    internal_note: args.internalNote,
    operation_key: args.operationKey,
  }, { onConflict: "operation_key", ignoreDuplicates: true });

  return data;
}

export async function setAdminUnlimited(args: {
  targetUserId: string;
  actingAdminId: string;
  reasonCategory: AdminCreditReasonCategory;
  internalNote: string | null;
  operationKey: string;
  mode: "grant_one_year" | "remove";
}) {
  const admin = requireAdminClient();
  await admin.rpc("ensure_credit_account", { p_user_id: args.targetUserId });

  const { data: existingAction } = await admin
    .from("admin_credit_actions")
    .select("id")
    .eq("operation_key", args.operationKey)
    .maybeSingle();

  if (existingAction) {
    return;
  }

  const { data: accountBefore, error: beforeError } = await admin
    .from("credit_accounts")
    .select("unlimited_until, credit_balance")
    .eq("user_id", args.targetUserId)
    .single();

  if (beforeError || !accountBefore) {
    throw new Error("unlimited_update_failed");
  }

  const before = accountBefore as { unlimited_until: string | null; credit_balance: number };
  const nextUnlimitedUntil =
    args.mode === "grant_one_year" ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;

  const { error: updateError } = await admin
    .from("credit_accounts")
    .update({ unlimited_until: nextUnlimitedUntil })
    .eq("user_id", args.targetUserId);

  if (updateError) {
    throw new Error("unlimited_update_failed");
  }

  await admin.from("credit_ledger").insert({
    user_id: args.targetUserId,
    delta: 0,
    balance_after: before.credit_balance,
    reason: args.mode === "grant_one_year" ? "unlimited_started" : "admin_adjustment",
    operation_key: args.operationKey,
    metadata: {
      source: "admin_support",
      action: args.mode === "grant_one_year" ? "unlimited_grant" : "unlimited_remove",
      acting_admin_id: args.actingAdminId,
      reason_category: args.reasonCategory,
      internal_note: args.internalNote,
      unlimited_until_before: before.unlimited_until,
      unlimited_until_after: nextUnlimitedUntil,
    },
  });

  await admin.from("admin_credit_actions").upsert({
    target_user_id: args.targetUserId,
    acting_admin_id: args.actingAdminId,
    action_type: args.mode === "grant_one_year" ? "unlimited_grant" : "unlimited_remove",
    amount: null,
    reason_category: args.reasonCategory,
    internal_note: args.internalNote,
    operation_key: args.operationKey,
    unlimited_until_before: before.unlimited_until,
    unlimited_until_after: nextUnlimitedUntil,
  }, { onConflict: "operation_key", ignoreDuplicates: true });
}
