import { notFound, redirect } from "next/navigation";
import { AdminSupportConsole } from "@/components/support/admin-support-console";
import { findAdminUserByExactEmail, getAdminDashboardSummary } from "@/domain/admin-support/service";
import { createSupabaseSupportService } from "@/domain/support/service";
import type { SupportStatus } from "@/domain/support/types";
import { grantCreditsAdminAction, searchAdminUserCreditsAction, updateUnlimitedAdminAction } from "@/lib/actions/admin-support";
import { updateSupportTicketAdminAction } from "@/lib/actions/support";
import { requireAuthenticatedSession } from "@/lib/auth/guards";

type AdminSupportPageProps = {
  searchParams?: Promise<{
    status?: string;
    ticket?: string;
    tab?: string;
    email?: string;
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
  const activeSection = normalizeSection(resolvedSearchParams.tab);
  const activeStatus = normalizeStatus(resolvedSearchParams.status);
  const tickets = activeSection === "reports" ? await service.listTickets(activeStatus) : [];
  const selectedTicket = resolvedSearchParams.ticket ? tickets.find((ticket) => ticket.id === resolvedSearchParams.ticket) ?? null : null;
  const dashboard = activeSection === "dashboard" ? await getSafeDashboard() : null;
  const searchEmail = resolvedSearchParams.email?.trim() ?? "";
  const userLookup = activeSection === "users" && searchEmail ? await getSafeUserLookup(searchEmail) : null;

  return (
    <AdminSupportConsole
      action={updateSupportTicketAdminAction}
      grantCreditsAction={grantCreditsAdminAction}
      searchUserAction={searchAdminUserCreditsAction}
      unlimitedAction={updateUnlimitedAdminAction}
      activeStatus={activeStatus}
      activeSection={activeSection}
      dashboard={dashboard}
      selectedTicket={selectedTicket}
      searchAttempted={activeSection === "users" && Boolean(searchEmail)}
      searchEmail={searchEmail}
      tickets={tickets}
      userLookup={userLookup}
    />
  );
}

function normalizeSection(tab: string | undefined): "dashboard" | "reports" | "users" {
  if (tab === "reports" || tab === "users" || tab === "dashboard") return tab;
  return "dashboard";
}

async function getSafeDashboard() {
  try {
    return await getAdminDashboardSummary();
  } catch {
    return null;
  }
}

async function getSafeUserLookup(email: string) {
  try {
    return await findAdminUserByExactEmail(email);
  } catch {
    return null;
  }
}
