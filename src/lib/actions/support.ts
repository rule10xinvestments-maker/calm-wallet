"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseSupportService } from "@/domain/support/service";
import { normalizeLocale } from "@/lib/i18n";
import {
  initialAdminSupportTicketActionState,
  initialSupportTicketActionState,
  type AdminSupportTicketActionState,
  type SupportTicketActionState,
} from "@/lib/actions/support-state";

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function getSafeSupportError(error: unknown) {
  if (error instanceof Error && error.message === "support_rate_limited") {
    return "Please wait a moment before sending another message.";
  }

  return "Support message could not be sent. Please try again.";
}

export async function createSupportTicketAction(
  _prevState: SupportTicketActionState,
  formData: FormData,
): Promise<SupportTicketActionState> {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    return {
      ...initialSupportTicketActionState,
      status: "error",
      message: "Sign in is required.",
    };
  }

  const headerStore = await headers();
  const locale = normalizeLocale(stringValue(formData.get("locale")));

  try {
    const service = await createSupabaseSupportService();
    await service.createTicket(auth.user, {
      category: stringValue(formData.get("category")),
      subject: stringValue(formData.get("subject")),
      message: stringValue(formData.get("message")),
      locale,
      sourceRoute: stringValue(formData.get("sourceRoute")),
      userAgent: stringValue(formData.get("userAgent")) || headerStore.get("user-agent") || null,
      appVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });

    revalidatePath("/assistant");
    revalidatePath("/admin/support");

    return {
      status: "success",
      message: "Message sent",
    };
  } catch (error) {
    return {
      ...initialSupportTicketActionState,
      status: "error",
      message: getSafeSupportError(error),
    };
  }
}

export async function updateSupportTicketAdminAction(
  _prevState: AdminSupportTicketActionState,
  formData: FormData,
): Promise<AdminSupportTicketActionState> {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    return {
      ...initialAdminSupportTicketActionState,
      status: "error",
      message: "Sign in is required.",
    };
  }

  try {
    const service = await createSupabaseSupportService();
    const isAdmin = await service.isAdmin(auth.user.id);

    if (!isAdmin) {
      return {
        ...initialAdminSupportTicketActionState,
        status: "error",
        message: "Support ticket could not be updated.",
      };
    }

    await service.updateTicket(auth.user.id, {
      ticketId: stringValue(formData.get("ticketId")),
      status: stringValue(formData.get("status")),
      adminNote: stringValue(formData.get("adminNote")),
    });

    revalidatePath("/admin/support");

    return {
      status: "success",
      message: "Support ticket updated.",
    };
  } catch {
    return {
      ...initialAdminSupportTicketActionState,
      status: "error",
      message: "Support ticket could not be updated.",
    };
  }
}
