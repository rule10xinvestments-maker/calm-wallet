"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  executeAccountDeletion,
  getDeletionConfirmationText,
  requestPublicDeletionVerification,
} from "@/domain/account-deletion/service";
import {
  initialAccountDeletionActionState,
  type AccountDeletionActionState,
} from "@/lib/actions/account-deletion-state";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { getAuthSession } from "@/lib/auth/session";
import { normalizeLocale } from "@/lib/i18n";

function safeDeletionError() {
  return "We could not complete deletion. Please try again.";
}

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getRequestIp(headerStore: Awaited<ReturnType<typeof headers>>) {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    null
  );
}

export async function requestPublicAccountDeletionAction(
  _prevState: AccountDeletionActionState,
  formData: FormData,
): Promise<AccountDeletionActionState> {
  const email = formString(formData, "email");
  const headerStore = await headers();

  try {
    await requestPublicDeletionVerification({
      email,
      ipAddress: getRequestIp(headerStore),
    });
  } catch {
    // Keep the public response generic and non-enumerating.
  }

  return {
    status: "success",
    message: "If the email is linked to a Calm Wallet account, a verification link has been sent.",
  };
}

export async function deleteSignedInAccountAction(
  _prevState: AccountDeletionActionState,
  formData: FormData,
): Promise<AccountDeletionActionState> {
  const auth = await getAuthSession();
  const user = auth.user;

  if (!user) {
    return {
      ...initialAccountDeletionActionState,
      status: "error",
      message: safeDeletionError(),
    };
  }

  const locale = normalizeLocale(formString(formData, "locale"));
  const confirmationText = getDeletionConfirmationText(locale);
  const typedConfirmation = formString(formData, "confirmationText");
  const confirmed = formData.get("confirmed") === "on";
  const source = formString(formData, "source") === "web" ? "web" : "in_app";

  if (!confirmed || typedConfirmation !== confirmationText) {
    return {
      ...initialAccountDeletionActionState,
      status: "error",
      message: "Confirm account deletion before continuing.",
    };
  }

  try {
    await executeAccountDeletion({
      userId: user.id,
      email: user.email,
      source,
    });
  } catch {
    return {
      ...initialAccountDeletionActionState,
      status: "error",
      message: safeDeletionError(),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // The Auth user has already been deleted. Redirect to completion either way.
  }

  revalidatePath("/", "layout");
  redirect("/account-deleted");
}
