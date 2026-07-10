import { notFound, redirect } from "next/navigation";
import { AdminSupportConsole } from "@/components/support/admin-support-console";
import { createSupabaseSupportService } from "@/domain/support/service";
import type { SupportStatus } from "@/domain/support/types";
import { updateSupportTicketAdminAction } from "@/lib/actions/support";
import { requireAuthenticatedSession } from "@/lib/auth/guards";
import { normalizeLocale, type SupportedLocale } from "@/lib/i18n";

type AdminSupportPageProps = {
  searchParams?: Promise<{
    status?: string;
    ticket?: string;
  }>;
};

const supportStatuses = ["new", "in_progress", "resolved", "closed"] as const;

function normalizeStatus(status: string | undefined): SupportStatus | "all" {
  return supportStatuses.includes(status as SupportStatus) ? (status as SupportStatus) : "all";
}

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  const auth = await requireAuthenticatedSession();

  if (!auth.user) {
    redirect("/sign-in");
  }

  const service = await createSupabaseSupportService();
  const isAdmin = await service.isAdmin(auth.user.id);

  if (!isAdmin) {
    notFound();
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const activeStatus = normalizeStatus(resolvedSearchParams.status);
  const tickets = await service.listTickets(activeStatus);
  const selectedTicket =
    (resolvedSearchParams.ticket ? tickets.find((ticket) => ticket.id === resolvedSearchParams.ticket) : null) ??
    tickets[0] ??
    null;
  const locale = normalizeLocale(auth.user.user_metadata?.ui_locale) as SupportedLocale;

  return (
    <AdminSupportConsole
      action={updateSupportTicketAdminAction}
      activeStatus={activeStatus}
      locale={locale}
      selectedTicket={selectedTicket}
      tickets={tickets}
    />
  );
}
