import { z } from "zod";
import { supportCategories, supportStatuses } from "@/domain/support/types";
import { supportedLocales } from "@/lib/i18n";

export const createSupportTicketSchema = z.object({
  category: z.enum(supportCategories).default("other_problem"),
  subject: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(supportedLocales).optional().nullable(),
  sourceRoute: z.string().trim().max(120).optional().nullable(),
  userAgent: z.string().trim().max(500).optional().nullable(),
  appVersion: z.string().trim().max(80).optional().nullable(),
  viewportWidth: z.coerce.number().int().positive().max(10000).optional().nullable(),
  viewportHeight: z.coerce.number().int().positive().max(10000).optional().nullable(),
  platformSummary: z.string().trim().max(160).optional().nullable(),
  pwaDisplayMode: z.enum(["standalone", "browser", "unknown"]).optional().nullable(),
  timezone: z.string().trim().max(80).optional().nullable(),
  onlineState: z.enum(["online", "offline", "unknown"]).optional().nullable(),
});

export const updateSupportTicketSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(supportStatuses),
  adminNote: z.string().trim().max(2000).optional().nullable(),
});
