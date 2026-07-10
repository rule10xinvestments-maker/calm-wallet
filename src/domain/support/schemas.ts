import { z } from "zod";
import { supportCategories, supportStatuses } from "@/domain/support/types";
import { supportedLocales } from "@/lib/i18n";

export const createSupportTicketSchema = z.object({
  category: z.enum(supportCategories).default("help"),
  subject: z.string().trim().max(120).optional().nullable(),
  message: z.string().trim().min(1).max(2000),
  locale: z.enum(supportedLocales).optional().nullable(),
  sourceRoute: z.string().trim().max(120).optional().nullable(),
  userAgent: z.string().trim().max(500).optional().nullable(),
  appVersion: z.string().trim().max(80).optional().nullable(),
});

export const updateSupportTicketSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(supportStatuses),
  adminNote: z.string().trim().max(2000).optional().nullable(),
});
