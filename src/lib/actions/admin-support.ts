"use server";

import { z } from "zod";
import {
  adminCreditReasonCategories,
  assertSupportAdmin,
  findAdminUserByExactEmail,
  grantAdminCredits,
  setAdminUnlimited,
  type AdminUserCreditLookup,
} from "@/domain/admin-support/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

const maxCreditGrant = 5_000;

const grantCreditsSchema = z.object({
  targetUserId: z.string().uuid(),
  email: z.string().trim().email(),
  amount: z.coerce.number().int().positive().max(maxCreditGrant),
  reasonCategory: z.enum(adminCreditReasonCategories),
  internalNote: z.string().trim().max(500).optional().nullable(),
  operationKey: z.string().trim().min(12).max(120),
});

const unlimitedSchema = z.object({
  targetUserId: z.string().uuid(),
  email: z.string().trim().email(),
  reasonCategory: z.enum(adminCreditReasonCategories),
  internalNote: z.string().trim().max(500).optional().nullable(),
  operationKey: z.string().trim().min(12).max(120),
  mode: z.enum(["grant_one_year", "remove"]),
  confirm: z.string().optional(),
});

const searchUserSchema = z.object({
  email: z.string().trim().email(),
});

export type AdminUserCreditsActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  user: AdminUserCreditLookup | null;
  email: string;
};

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function requireAdminUser() {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    throw new Error("admin_forbidden");
  }

  await assertSupportAdmin(auth.user.id);
  return auth.user;
}

function logAdminActionFailure(args: {
  actionType: string;
  actingAdminId?: string | null;
  targetUserId?: string | null;
  errorCode: string;
}) {
  console.error("[admin-support-action-failed]", {
    actionType: args.actionType,
    actingAdminId: args.actingAdminId ?? null,
    targetUserId: args.targetUserId ?? null,
    errorCode: args.errorCode,
    timestamp: new Date().toISOString(),
  });
}

function safeErrorCode(error: unknown, fallback: string) {
  if (error instanceof Error && /^[a-z_]+$/.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export async function markAuthenticatedAppActivityAction(): Promise<void> {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.rpc("mark_authenticated_app_activity" as never);
  } catch {
    // Activity markers are best-effort and must never block the product.
  }
}

export async function grantCreditsAdminAction(
  prevState: AdminUserCreditsActionState,
  formData: FormData,
): Promise<AdminUserCreditsActionState> {
  let actingAdminId: string | null = null;
  let targetUserId: string | null = null;
  let email = normalizeEmail(stringValue(formData.get("email")) || prevState.email);
  try {
    const admin = await requireAdminUser();
    actingAdminId = admin.id;
    const parsed = grantCreditsSchema.parse({
      targetUserId: stringValue(formData.get("targetUserId")),
      email,
      amount: stringValue(formData.get("amount")),
      reasonCategory: stringValue(formData.get("reasonCategory")),
      internalNote: stringValue(formData.get("internalNote")) || null,
      operationKey: stringValue(formData.get("operationKey")),
    });
    targetUserId = parsed.targetUserId;
    email = parsed.email;

    await grantAdminCredits({
      targetUserId: parsed.targetUserId,
      actingAdminId: admin.id,
      amount: parsed.amount,
      reasonCategory: parsed.reasonCategory,
      internalNote: parsed.internalNote ?? null,
      operationKey: `admin-credit:${parsed.operationKey}`,
    });

    const user = await findAdminUserByExactEmail(parsed.email);

    return {
      status: "success",
      message: `${parsed.amount} credits added.`,
      user,
      email: parsed.email,
    };
  } catch (error) {
    logAdminActionFailure({ actionType: "credit_grant", actingAdminId, targetUserId, errorCode: safeErrorCode(error, "credit_grant_failed") });
    return { status: "error", message: "Credits could not be added.", user: prevState.user, email };
  }
}

export async function updateUnlimitedAdminAction(
  prevState: AdminUserCreditsActionState,
  formData: FormData,
): Promise<AdminUserCreditsActionState> {
  let actingAdminId: string | null = null;
  let targetUserId: string | null = null;
  let email = normalizeEmail(stringValue(formData.get("email")) || prevState.email);
  try {
    const admin = await requireAdminUser();
    actingAdminId = admin.id;
    const parsed = unlimitedSchema.parse({
      targetUserId: stringValue(formData.get("targetUserId")),
      email,
      reasonCategory: stringValue(formData.get("reasonCategory")),
      internalNote: stringValue(formData.get("internalNote")) || null,
      operationKey: stringValue(formData.get("operationKey")),
      mode: stringValue(formData.get("mode")),
      confirm: stringValue(formData.get("confirm")),
    });
    targetUserId = parsed.targetUserId;
    email = parsed.email;

    if (parsed.mode === "remove" && parsed.confirm !== "remove") {
      return { status: "error", message: "Confirm removal before continuing.", user: prevState.user, email: parsed.email };
    }

    await setAdminUnlimited({
      targetUserId: parsed.targetUserId,
      actingAdminId: admin.id,
      reasonCategory: parsed.reasonCategory,
      internalNote: parsed.internalNote ?? null,
      operationKey: `admin-unlimited:${parsed.operationKey}`,
      mode: parsed.mode,
    });

    const user = await findAdminUserByExactEmail(parsed.email);

    return {
      status: "success",
      message: parsed.mode === "grant_one_year" ? "Unlimited granted." : "Unlimited removed.",
      user,
      email: parsed.email,
    };
  } catch (error) {
    logAdminActionFailure({ actionType: "unlimited_update", actingAdminId, targetUserId, errorCode: safeErrorCode(error, "unlimited_update_failed") });
    return { status: "error", message: "Unlimited could not be updated.", user: prevState.user, email };
  }
}

export async function searchAdminUserCreditsAction(
  prevState: AdminUserCreditsActionState,
  formData: FormData,
): Promise<AdminUserCreditsActionState> {
  const email = normalizeEmail(stringValue(formData.get("email")) || prevState.email);

  try {
    await requireAdminUser();
    const parsed = searchUserSchema.parse({ email });
    const user = await findAdminUserByExactEmail(parsed.email);

    return {
      status: user ? "success" : "error",
      message: user ? "User found." : "No user found for that exact email.",
      user,
      email: parsed.email,
    };
  } catch (error) {
    logAdminActionFailure({ actionType: "user_lookup", errorCode: safeErrorCode(error, "user_lookup_failed") });
    return { status: "error", message: "User lookup could not be completed.", user: null, email };
  }
}
