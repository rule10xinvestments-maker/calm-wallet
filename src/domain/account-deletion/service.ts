import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { getRequiredEnv } from "@/lib/auth/shared";

export type AccountDeletionStatus = "requested" | "verified" | "processing" | "completed" | "failed";
export type AccountDeletionSource = "in_app" | "web";
export type AccountDeletionFailureCategory =
  | "database_cleanup_failed"
  | "storage_cleanup_failed"
  | "auth_delete_failed"
  | "verification_failed"
  | "rate_limited"
  | "admin_unavailable"
  | "unknown";

type DeletionRequestRow = {
  id: string;
  user_id: string | null;
  email_hash: string;
  source: AccountDeletionSource;
  status: AccountDeletionStatus;
  requested_at: string;
};

type AdminClient = SupabaseClient & {
  auth: SupabaseClient["auth"] & {
    admin: {
      deleteUser: (userId: string) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>;
};

const RETENTION_SUMMARY =
  "Minimal anonymized records may be retained for billing, fraud prevention, security, dispute handling, legal obligations, and operational audit.";

export function normalizeDeletionEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getDeletionConfirmationText(locale: string) {
  return locale === "ro" ? "STERGE" : locale === "fr" ? "SUPPRIMER" : locale === "es" ? "ELIMINAR" : "DELETE";
}

export function hashDeletionIdentifier(value: string) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function requireAdminClient() {
  const client = createSupabaseAdminClient();
  if (!client) {
    throw new Error("admin_unavailable");
  }
  return client as AdminClient;
}

function cleanStoragePaths(rows: Array<{ storage_path?: string | null }> | null | undefined) {
  return Array.from(
    new Set(
      (rows ?? [])
        .map((row) => row.storage_path?.trim())
        .filter((path): path is string => Boolean(path)),
    ),
  );
}

async function listAccountStoragePaths(admin: AdminClient, userId: string) {
  const [supportAttachments, imports] = await Promise.all([
    admin.from("support_ticket_attachments").select("storage_path").eq("user_id", userId),
    admin.from("import_records").select("storage_path").eq("user_id", userId),
  ]);

  if (supportAttachments.error || imports.error) {
    throw new Error("database_cleanup_failed");
  }

  return {
    supportAttachmentPaths: cleanStoragePaths(supportAttachments.data as Array<{ storage_path: string }> | null),
    stagedImportPaths: cleanStoragePaths(imports.data as Array<{ storage_path: string }> | null),
  };
}

async function removeStoragePaths(admin: AdminClient, bucket: string, paths: string[]) {
  if (!paths.length) {
    return;
  }

  const { error } = await admin.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error("storage_cleanup_failed");
  }
}

async function markRequestFailed(admin: AdminClient, requestId: string, failureCategory: AccountDeletionFailureCategory) {
  await admin
    .from("account_deletion_requests")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      failure_category: failureCategory,
    })
    .eq("id", requestId);
}

async function markRequestCompleted(admin: AdminClient, requestId: string) {
  await admin
    .from("account_deletion_requests")
    .update({
      user_id: null,
      status: "completed",
      completed_at: new Date().toISOString(),
      failed_at: null,
      failure_category: null,
      retention_exception_summary: RETENTION_SUMMARY,
    })
    .eq("id", requestId);
}

async function createVerifiedRequest(args: {
  admin: AdminClient;
  userId: string;
  emailHash: string;
  source: AccountDeletionSource;
}) {
  const { data, error } = await args.admin
    .from("account_deletion_requests")
    .insert({
      user_id: args.userId,
      email_hash: args.emailHash,
      source: args.source,
      status: "verified",
      verified_at: new Date().toISOString(),
      retention_exception_summary: RETENTION_SUMMARY,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("database_cleanup_failed");
  }

  return data as DeletionRequestRow;
}

export async function requestPublicDeletionVerification(args: {
  email: string;
  ipAddress?: string | null;
}) {
  const normalizedEmail = normalizeDeletionEmail(args.email);
  const emailHash = hashDeletionIdentifier(normalizedEmail);
  const ipHash = args.ipAddress ? hashDeletionIdentifier(args.ipAddress) : null;

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return;
  }

  const admin = createSupabaseAdminClient() as AdminClient | null;
  if (admin) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await admin
      .from("account_deletion_requests")
      .select("id", { count: "exact", head: true })
      .eq("email_hash", emailHash)
      .eq("source", "web")
      .gte("requested_at", since);

    if ((recent.count ?? 0) >= 3) {
      await admin.from("account_deletion_requests").insert({
        email_hash: emailHash,
        ip_hash: ipHash,
        source: "web",
        status: "failed",
        failure_category: "rate_limited",
        failed_at: new Date().toISOString(),
        retention_exception_summary: RETENTION_SUMMARY,
      });
      return;
    }

    await admin.from("account_deletion_requests").insert({
      email_hash: emailHash,
      ip_hash: ipHash,
      source: "web",
      status: "requested",
      retention_exception_summary: RETENTION_SUMMARY,
    });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const redirectTo = new URL("/auth/callback", getRequiredEnv("NEXT_PUBLIC_SITE_URL"));
    redirectTo.searchParams.set("next", "/delete-account?verified=1");
    await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: redirectTo.toString(),
      },
    });
  } catch {
    // Keep the public response identical for known and unknown emails.
  }
}

export async function isAccountDeletionSchemaAvailable() {
  const admin = createSupabaseAdminClient() as AdminClient | null;
  if (!admin) {
    return false;
  }

  try {
    const { error } = await admin.from("account_deletion_requests").select("id").limit(0);
    return !error;
  } catch {
    return false;
  }
}

export async function executeAccountDeletion(args: {
  userId: string;
  email: string | null | undefined;
  source: AccountDeletionSource;
}) {
  const admin = requireAdminClient();
  const emailHash = hashDeletionIdentifier(args.email || args.userId);
  const request = await createVerifiedRequest({
    admin,
    userId: args.userId,
    emailHash,
    source: args.source,
  });

  try {
    const paths = await listAccountStoragePaths(admin, args.userId);
    const cleanup = await admin.rpc("cleanup_account_for_deletion", {
      p_request_id: request.id,
      p_user_id: args.userId,
    });

    if (cleanup.error) {
      throw new Error("database_cleanup_failed");
    }

    await removeStoragePaths(admin, "support-attachments", paths.supportAttachmentPaths);
    await removeStoragePaths(admin, "staged-imports", paths.stagedImportPaths);

    const deleteResult = await admin.auth.admin.deleteUser(args.userId);
    if (deleteResult.error) {
      throw new Error("auth_delete_failed");
    }

    await markRequestCompleted(admin, request.id);

    return {
      requestId: request.id,
      status: "completed" as const,
    };
  } catch (error) {
    const category =
      error instanceof Error &&
      ["database_cleanup_failed", "storage_cleanup_failed", "auth_delete_failed"].includes(error.message)
        ? (error.message as AccountDeletionFailureCategory)
        : "unknown";
    await markRequestFailed(admin, request.id, category);
    throw new Error(category);
  }
}
