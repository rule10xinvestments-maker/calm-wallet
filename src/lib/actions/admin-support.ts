"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  adminCreditReasonCategories,
  assertSupportAdmin,
  grantAdminCredits,
  setAdminUnlimited,
} from "@/domain/admin-support/service";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import type { SupportTicketActionState } from "@/lib/actions/support-state";

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
  _prevState: SupportTicketActionState,
  formData: FormData,
): Promise<SupportTicketActionState> {
  try {
    const admin = await requireAdminUser();
    const parsed = grantCreditsSchema.parse({
      targetUserId: stringValue(formData.get("targetUserId")),
      email: normalizeEmail(stringValue(formData.get("email"))),
      amount: stringValue(formData.get("amount")),
      reasonCategory: stringValue(formData.get("reasonCategory")),
      internalNote: stringValue(formData.get("internalNote")) || null,
      operationKey: stringValue(formData.get("operationKey")),
    });

    await grantAdminCredits({
      targetUserId: parsed.targetUserId,
      actingAdminId: admin.id,
      amount: parsed.amount,
      reasonCategory: parsed.reasonCategory,
      internalNote: parsed.internalNote ?? null,
      operationKey: `admin-credit:${parsed.operationKey}`,
    });
  } catch {
    return { status: "error", message: "Credits could not be added." };
  }

  revalidatePath("/admin/support");
  redirect(`/admin/support?tab=users&email=${encodeURIComponent(normalizeEmail(stringValue(formData.get("email"))))}&updated=credits`);
}

export async function updateUnlimitedAdminAction(
  _prevState: SupportTicketActionState,
  formData: FormData,
): Promise<SupportTicketActionState> {
  try {
    const admin = await requireAdminUser();
    const parsed = unlimitedSchema.parse({
      targetUserId: stringValue(formData.get("targetUserId")),
      email: normalizeEmail(stringValue(formData.get("email"))),
      reasonCategory: stringValue(formData.get("reasonCategory")),
      internalNote: stringValue(formData.get("internalNote")) || null,
      operationKey: stringValue(formData.get("operationKey")),
      mode: stringValue(formData.get("mode")),
      confirm: stringValue(formData.get("confirm")),
    });

    if (parsed.mode === "remove" && parsed.confirm !== "remove") {
      return { status: "error", message: "Confirm removal before continuing." };
    }

    await setAdminUnlimited({
      targetUserId: parsed.targetUserId,
      actingAdminId: admin.id,
      reasonCategory: parsed.reasonCategory,
      internalNote: parsed.internalNote ?? null,
      operationKey: `admin-unlimited:${parsed.operationKey}`,
      mode: parsed.mode,
    });
  } catch {
    return { status: "error", message: "Unlimited could not be updated." };
  }

  revalidatePath("/admin/support");
  redirect(`/admin/support?tab=users&email=${encodeURIComponent(normalizeEmail(stringValue(formData.get("email"))))}&updated=unlimited`);
}
