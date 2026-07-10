import { notFound, redirect } from "next/navigation";
import { AdminSupportConsole } from "@/components/support/admin-support-console";
import { createSupabaseSupportService } from "@/domain/support/service";
import type { SupportStatus } from "@/domain/support/types";
import { updateSupportTicketAdminAction } from "@/lib/actions/support";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

type AdminSupportPageProps = {
  searchParams?: Promise<{
    status?: string;
    ticket?: string;
  }>;
};

const supportFilters = ["active", "new", "in_progress", "resolved", "closed", "archived", "all"] as const;

function normalizeStatus(status: string | undefined): SupportStatus | "active" | "all" {
  return supportFilters.includes(status as SupportStatus | "active" | "all") ? (status as SupportStatus | "active" | "all") : "active";
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
  const selectedTicket = resolvedSearchParams.ticket ? tickets.find((ticket) => ticket.id === resolvedSearchParams.ticket) ?? null : null;

  return (
    <AdminSupportConsole
      action={updateSupportTicketAdminAction}
      activeStatus={activeStatus}
      selectedTicket={selectedTicket}
      tickets={tickets}
    />
  );
}
