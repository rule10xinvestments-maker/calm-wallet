"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { createSupabaseSupportService } from "@/domain/support/service";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
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

const SUPPORT_ATTACHMENT_BUCKET = "support-attachments";
const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getExtension(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  return "webp";
}

function isFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function getImageDimensions(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/png") {
    const isPng =
      bytes.length > 24 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    if (!isPng) return null;
    return {
      width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19],
      height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23],
    };
  }

  if (contentType === "image/webp") {
    const isWebp =
      bytes.length > 30 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!isWebp) return null;
    if (String.fromCharCode(...bytes.slice(12, 16)) === "VP8X") {
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    }
    return { width: null, height: null };
  }

  if (contentType === "image/jpeg") {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if (length < 2) return null;
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: (bytes[offset + 5] << 8) + bytes[offset + 6],
          width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        };
      }
      offset += 2 + length;
    }
  }

  return null;
}

async function uploadSupportAttachments(args: {
  formData: FormData;
  ticketId: string;
  userId: string;
  service: Awaited<ReturnType<typeof createSupabaseSupportService>>;
}) {
  const files = args.formData.getAll("screenshots").filter(isFile);
  const selectedFiles = files.slice(0, MAX_ATTACHMENT_COUNT);

  if (files.length > MAX_ATTACHMENT_COUNT) {
    return { failed: true };
  }

  if (selectedFiles.length === 0) {
    return { failed: false };
  }

  const supabase = await createSupabaseServerClient();
  let failed = false;

  for (const file of selectedFiles) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type) || file.size > MAX_ATTACHMENT_BYTES) {
      failed = true;
      continue;
    }

    const attachmentId = crypto.randomUUID();
    const content = new Uint8Array(await file.arrayBuffer());
    const dimensions = getImageDimensions(content, file.type);

    if (!dimensions) {
      failed = true;
      continue;
    }

    const storagePath = `${args.userId}/${args.ticketId}/${attachmentId}.${getExtension(file.type)}`;
    const upload = await supabase.storage.from(SUPPORT_ATTACHMENT_BUCKET).upload(storagePath, content, {
      contentType: file.type,
      upsert: false,
    });

    if (upload.error) {
      failed = true;
      continue;
    }

    try {
      await args.service.createAttachment({
        id: attachmentId,
        ticket_id: args.ticketId,
        user_id: args.userId,
        storage_path: storagePath,
        original_filename: file.name.slice(0, 180) || null,
        content_type: file.type,
        byte_size: file.size,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch {
      failed = true;
      await supabase.storage.from(SUPPORT_ATTACHMENT_BUCKET).remove([storagePath]);
    }
  }

  return { failed };
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
    const ticket = await service.createTicket(auth.user, {
      category: stringValue(formData.get("category")),
      subject: stringValue(formData.get("subject")),
      message: stringValue(formData.get("message")),
      locale,
      sourceRoute: stringValue(formData.get("sourceRoute")),
      userAgent: stringValue(formData.get("userAgent")) || headerStore.get("user-agent") || null,
      appVersion: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    });
    const uploadResult = await uploadSupportAttachments({
      formData,
      ticketId: ticket.id,
      userId: auth.user.id,
      service,
    });

    revalidatePath("/assistant");
    revalidatePath("/admin/support");

    return {
      status: "success",
      message: uploadResult.failed ? "Report saved but one screenshot could not be uploaded." : "Problem reported",
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
