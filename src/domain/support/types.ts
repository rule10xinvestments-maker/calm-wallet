export const supportCategories = ["app_bug", "account_issue", "data_issue", "notification_issue", "other_problem"] as const;
export const supportStatuses = ["new", "in_progress", "resolved", "closed", "archived"] as const;

export type SupportCategory = (typeof supportCategories)[number];
export type SupportStatus = (typeof supportStatuses)[number];

export type SupportAttachmentRow = {
  id: string;
  ticket_id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  content_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type SupportAttachment = {
  id: string;
  ticketId: string;
  userId: string;
  storagePath: string;
  originalFilename: string | null;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type SupportTicketRow = {
  id: string;
  user_id: string;
  user_email: string;
  category: SupportCategory;
  subject: string | null;
  message: string;
  status: SupportStatus;
  locale: string | null;
  source_route: string | null;
  user_agent: string | null;
  app_version: string | null;
  admin_note: string | null;
  assigned_admin_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  support_ticket_attachments?: SupportAttachmentRow[];
};

export type SupportTicket = {
  id: string;
  userId: string;
  userEmail: string;
  category: SupportCategory;
  subject: string | null;
  message: string;
  status: SupportStatus;
  locale: string | null;
  sourceRoute: string | null;
  userAgent: string | null;
  appVersion: string | null;
  adminNote: string | null;
  assignedAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  attachments: SupportAttachment[];
};
