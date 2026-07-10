export const supportCategories = ["help", "bug", "feedback", "account", "other"] as const;
export const supportStatuses = ["new", "in_progress", "resolved", "closed"] as const;

export type SupportCategory = (typeof supportCategories)[number];
export type SupportStatus = (typeof supportStatuses)[number];

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
};
