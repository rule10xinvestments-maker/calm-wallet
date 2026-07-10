import { createSupportTicketSchema, updateSupportTicketSchema } from "@/domain/support/schemas";
import type { SupportAttachment, SupportAttachmentRow, SupportStatus, SupportTicket, SupportTicketRow } from "@/domain/support/types";
import { createSupabaseServerClient } from "@/lib/auth/server-client";

type QueryResult<T> = Promise<{ data: T | null; error: unknown }>;

type SupportTicketInsertRow = {
  user_id: string;
  user_email: string;
  category: string;
  subject: string | null;
  message: string;
  locale: string | null;
  source_route: string | null;
  user_agent: string | null;
  app_version: string | null;
};

type SupportTicketUpdateRow = {
  status: SupportStatus;
  admin_note: string | null;
  assigned_admin_id?: string;
};

type SupportAttachmentInsertRow = {
  id?: string;
  ticket_id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
};

type SupportServiceAdapter = {
  isAdmin(userId: string): Promise<{ data: { user_id: string } | null; error: unknown }>;
  getLatestTicket(userId: string): QueryResult<Pick<SupportTicketRow, "created_at">>;
  createTicket(row: SupportTicketInsertRow): QueryResult<SupportTicketRow>;
  listTickets(status: SupportStatus | "active" | "all"): Promise<{ data: SupportTicketRow[] | null; error: unknown }>;
  getTicket(ticketId: string): QueryResult<SupportTicketRow>;
  updateTicket(ticketId: string, row: SupportTicketUpdateRow): QueryResult<SupportTicketRow>;
  createAttachment(row: SupportAttachmentInsertRow): QueryResult<SupportAttachmentRow>;
  getAttachment(attachmentId: string): QueryResult<SupportAttachmentRow>;
};

function mapAttachment(row: SupportAttachmentRow): SupportAttachment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

function mapTicket(row: SupportTicketRow): SupportTicket {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    category: row.category,
    subject: row.subject,
    message: row.message,
    status: row.status,
    locale: row.locale,
    sourceRoute: row.source_route,
    userAgent: row.user_agent,
    appVersion: row.app_version,
    adminNote: row.admin_note,
    assignedAdminId: row.assigned_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    archivedAt: row.archived_at,
    attachments: (row.support_ticket_attachments ?? []).map(mapAttachment),
  };
}

function assertResult<T>(result: { data: T | null; error: unknown }, fallbackMessage: string) {
  if (result.error || !result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function cleanOptional(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function createSupportService(adapter: SupportServiceAdapter) {
  return {
    async isAdmin(userId: string) {
      const result = await adapter.isAdmin(userId);
      return Boolean(result.data && !result.error);
    },

    async createTicket(
      user: { id: string; email?: string | null },
      input: unknown,
      options: { now?: Date; cooldownMs?: number } = {},
    ) {
      const parsed = createSupportTicketSchema.parse(input);
      const latest = await adapter.getLatestTicket(user.id);
      const now = options.now ?? new Date();
      const cooldownMs = options.cooldownMs ?? 30_000;

      if (latest.data) {
        const latestTime = new Date(latest.data.created_at).getTime();
        if (Number.isFinite(latestTime) && now.getTime() - latestTime < cooldownMs) {
          throw new Error("support_rate_limited");
        }
      }

      const row = assertResult(
        await adapter.createTicket({
          user_id: user.id,
          user_email: cleanOptional(user.email) ?? "unknown",
          category: parsed.category,
          subject: cleanOptional(parsed.subject),
          message: parsed.message,
          locale: parsed.locale ?? null,
          source_route: cleanOptional(parsed.sourceRoute),
          user_agent: cleanOptional(parsed.userAgent),
          app_version: cleanOptional(parsed.appVersion),
        }),
        "Unable to create support ticket.",
      );

      return mapTicket(row);
    },

    async listTickets(status: SupportStatus | "active" | "all" = "all") {
      const result = await adapter.listTickets(status);

      if (result.error) {
        throw new Error("Unable to load support tickets.");
      }

      return (result.data ?? []).map(mapTicket);
    },

    async getTicket(ticketId: string) {
      const row = assertResult(await adapter.getTicket(ticketId), "Unable to load support ticket.");
      return mapTicket(row);
    },

    async updateTicket(adminId: string, input: unknown) {
      const parsed = updateSupportTicketSchema.parse(input);
      const row = assertResult(
        await adapter.updateTicket(parsed.ticketId, {
          status: parsed.status,
          admin_note: cleanOptional(parsed.adminNote),
          assigned_admin_id: adminId,
        }),
        "Unable to update support ticket.",
      );
      return mapTicket(row);
    },

    async createAttachment(row: SupportAttachmentInsertRow) {
      return mapAttachment(assertResult(await adapter.createAttachment(row), "Unable to save attachment metadata."));
    },

    async getAttachment(attachmentId: string) {
      return mapAttachment(assertResult(await adapter.getAttachment(attachmentId), "Unable to load attachment."));
    },
  };
}

export async function createSupabaseSupportService() {
  const supabase = await createSupabaseServerClient();

  return createSupportService({
    async isAdmin(userId) {
      return supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
    },
    async getLatestTicket(userId) {
      return supabase
        .from("support_tickets")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    },
    async createTicket(row) {
      return supabase.from("support_tickets").insert(row).select("*").single();
    },
    async listTickets(status) {
      let query = supabase
        .from("support_tickets")
        .select("*, support_ticket_attachments(*)")
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "support_ticket_attachments", ascending: true });
      if (status === "active") {
        query = query.in("status", ["new", "in_progress"]);
      } else if (status !== "all") {
        query = query.eq("status", status);
      }
      return query;
    },
    async getTicket(ticketId) {
      return supabase
        .from("support_tickets")
        .select("*, support_ticket_attachments(*)")
        .eq("id", ticketId)
        .single();
    },
    async updateTicket(ticketId, row) {
      return supabase.from("support_tickets").update(row).eq("id", ticketId).select("*").single();
    },
    async createAttachment(row) {
      return supabase.from("support_ticket_attachments").insert(row).select("*").single();
    },
    async getAttachment(attachmentId) {
      return supabase.from("support_ticket_attachments").select("*").eq("id", attachmentId).single();
    },
  });
}
