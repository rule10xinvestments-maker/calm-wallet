"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, ChevronDown, CreditCard, Image as ImageIcon, Search } from "lucide-react";
import { initialAdminSupportTicketActionState, type AdminSupportTicketActionState } from "@/lib/actions/support-state";
import type { AdminDashboardSummary, AdminUserCreditLookup } from "@/domain/admin-support/service";
import type { SupportStatus, SupportTicket } from "@/domain/support/types";
import { Button } from "@/components/ui/button";

type AdminSupportConsoleProps = {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  activeStatus: SupportStatus | "active" | "all";
  activeSection?: "dashboard" | "reports" | "users";
  dashboard?: AdminDashboardSummary | null;
  userLookup?: AdminUserCreditLookup | null;
  searchEmail?: string;
  searchAttempted?: boolean;
  action: (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;
  grantCreditsAction?: (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;
  unlimitedAction?: (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;
};

type AdminConsoleAction = (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;

const statusFilters: Array<SupportStatus | "active" | "all"> = ["active", "new", "in_progress", "resolved", "closed", "archived", "all"];
const editableStatuses: SupportStatus[] = ["new", "in_progress", "resolved"];
const reasonCategories = [
  ["giveaway", "Giveaway"],
  ["promotion", "Promotion"],
  ["support_correction", "Support correction"],
  ["testing", "Testing"],
  ["billing_correction", "Billing correction"],
  ["other", "Other"],
] as const;
const categoryLabels: Record<string, string> = {
  app_bug: "App problem",
  account_issue: "Account or sign-in",
  data_issue: "Missing or incorrect data",
  notification_issue: "Notification problem",
  other_problem: "Other problem",
};
const statusLabels: Record<SupportStatus | "active" | "all", string> = {
  active: "Active",
  all: "All",
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
  archived: "Archived",
};
const sections = [
  { id: "dashboard", label: "Dashboard" },
  { id: "reports", label: "Reports" },
  { id: "users", label: "Users & Credits" },
] as const;

async function unavailableAdminAction(): Promise<AdminSupportTicketActionState> {
  return { status: "error", message: "Admin action is unavailable." };
}

export function AdminSupportConsole({
  tickets,
  selectedTicket,
  activeStatus,
  activeSection = "reports",
  dashboard = null,
  userLookup = null,
  searchEmail = "",
  searchAttempted = false,
  action,
  grantCreditsAction = unavailableAdminAction,
  unlimitedAction = unavailableAdminAction,
}: AdminSupportConsoleProps) {
  return (
    <section className="space-y-4">
      <header className={`space-y-2 ${selectedTicket && activeSection === "reports" ? "hidden md:block" : ""}`}>
        <p className="text-sm font-medium text-sky-700">Admin</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Support</h2>
        <p className="text-sm leading-6 text-slate-500">Review reports, resolve credit issues, and check aggregate product health.</p>
      </header>

      <nav className={`flex gap-2 overflow-x-auto pb-1 ${selectedTicket && activeSection === "reports" ? "hidden md:flex" : ""}`} aria-label="Admin sections">
        {sections.map((section) => (
          <Link
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${
              activeSection === section.id ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"
            }`}
            href={`/admin/support?tab=${section.id}`}
            key={section.id}
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {activeSection === "dashboard" ? <DashboardSection dashboard={dashboard} /> : null}
      {activeSection === "users" ? (
        <UsersCreditsSection
          grantCreditsAction={grantCreditsAction}
          searchAttempted={searchAttempted}
          searchEmail={searchEmail}
          unlimitedAction={unlimitedAction}
          userLookup={userLookup}
        />
      ) : null}
      {activeSection === "reports" ? (
        <ReportsSection action={action} activeStatus={activeStatus} selectedTicket={selectedTicket} tickets={tickets} />
      ) : null}
    </section>
  );
}

function DashboardSection({ dashboard }: { dashboard: AdminDashboardSummary | null }) {
  if (!dashboard) {
    return <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">Dashboard could not load.</p>;
  }

  const cards = [
    ["Total registered users", dashboard.totalUsers],
    ["Active today", dashboard.activeToday],
    ["Active last 7 days", dashboard.active7Days],
    ["Active last 30 days", dashboard.active30Days],
    ["Active Unlimited users", dashboard.activeUnlimitedUsers],
  ] as const;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <BarChart3 aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Owner dashboard</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Active users are counted from authenticated product activity, updated at most once per user per day. Admin-only activity is excluded.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map(([label, value]) => (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3" key={label}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Last refreshed {formatDateTime(dashboard.refreshedAt)}.</p>
    </div>
  );
}

function UsersCreditsSection({
  userLookup,
  searchEmail,
  searchAttempted,
  grantCreditsAction,
  unlimitedAction,
}: {
  userLookup: AdminUserCreditLookup | null;
  searchEmail: string;
  searchAttempted: boolean;
  grantCreditsAction: AdminConsoleAction;
  unlimitedAction: AdminConsoleAction;
}) {
  return (
    <div className="space-y-3">
      <form action="/admin/support" className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
        <input name="tab" type="hidden" value="users" />
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Exact email lookup</span>
          <span className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-300 focus-within:bg-white">
            <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              defaultValue={searchEmail}
              name="email"
              placeholder="user@example.com"
              type="email"
            />
          </span>
        </label>
        <Button className="mt-3 w-full" type="submit">
          Search user
        </Button>
      </form>

      {searchAttempted && !userLookup ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">No user found for that exact email.</p>
      ) : null}

      {userLookup ? (
        <div className="space-y-3">
          <UserCreditSummary user={userLookup} />
          <AdminCreditGrantForm action={grantCreditsAction} user={userLookup} />
          <AdminUnlimitedForm action={unlimitedAction} user={userLookup} />
          <RecentLedgerEvents events={userLookup.recentLedgerEvents} />
        </div>
      ) : null}
    </div>
  );
}

function UserCreditSummary({ user }: { user: AdminUserCreditLookup }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <CreditCard aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-slate-900">{user.email}</p>
          <p className="mt-1 break-all text-[11px] text-slate-400">ID {user.userId}</p>
        </div>
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <MetaRow label="Credit balance" value={`${user.creditBalance} credits`} />
        <MetaRow label="Recurring grace debt" value={user.recurringGraceDebt > 0 ? `${user.recurringGraceDebt} credit` : "None"} />
        <MetaRow
          label="Unlimited"
          value={user.unlimitedActive ? `Active until ${formatDateTime(user.unlimitedUntil ?? "")}` : "Not active"}
        />
      </dl>
    </div>
  );
}

function AdminCreditGrantForm({ user, action }: { user: AdminUserCreditLookup; action: AdminConsoleAction }) {
  const [state, formAction, isPending] = useActionState(action, initialAdminSupportTicketActionState);
  const [amount, setAmount] = useState("");
  const [operationKey] = useState(() => crypto.randomUUID());
  const numericAmount = Number(amount);
  const requiresLargeConfirm = Number.isInteger(numericAmount) && numericAmount >= 500;

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <input name="targetUserId" type="hidden" value={user.userId} />
      <input name="email" type="hidden" value={user.email} />
      <input name="operationKey" type="hidden" value={operationKey} />
      <h3 className="text-sm font-semibold text-slate-900">Add credits</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Credit amount</span>
          <input
            className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-sky-300 focus:bg-white"
            inputMode="numeric"
            max={5000}
            min={1}
            name="amount"
            onChange={(event) => setAmount(event.currentTarget.value)}
            pattern="[0-9]*"
            required
            type="text"
            value={amount}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Reason</span>
          <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" name="reasonCategory" required>
            {reasonCategories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-slate-700">Internal note</span>
        <textarea className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" maxLength={500} name="internalNote" />
      </label>
      {requiresLargeConfirm ? (
        <label className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <input className="mt-0.5" required type="checkbox" />
          <span>Confirm this unusually large credit grant.</span>
        </label>
      ) : null}
      <ActionMessage state={state} />
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Adding..." : "Add credits"}
      </Button>
    </form>
  );
}

function AdminUnlimitedForm({ user, action }: { user: AdminUserCreditLookup; action: AdminConsoleAction }) {
  const [state, formAction, isPending] = useActionState(action, initialAdminSupportTicketActionState);
  const [mode, setMode] = useState<"grant_one_year" | "remove">("grant_one_year");
  const [operationKey] = useState(() => crypto.randomUUID());
  const nextExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <input name="targetUserId" type="hidden" value={user.userId} />
      <input name="email" type="hidden" value={user.email} />
      <input name="operationKey" type="hidden" value={operationKey} />
      <h3 className="text-sm font-semibold text-slate-900">Unlimited controls</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className={`rounded-xl border px-3 py-2 text-sm ${mode === "grant_one_year" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <input className="sr-only" name="mode" onChange={() => setMode("grant_one_year")} type="radio" value="grant_one_year" checked={mode === "grant_one_year"} />
          Grant one year
        </label>
        <label className={`rounded-xl border px-3 py-2 text-sm ${mode === "remove" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          <input className="sr-only" name="mode" onChange={() => setMode("remove")} type="radio" value="remove" checked={mode === "remove"} />
          Remove
        </label>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        {mode === "grant_one_year" ? `Resulting expiry: ${formatDateTime(nextExpiry)}.` : "Removing Unlimited requires confirmation."}
      </p>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-slate-700">Reason</span>
        <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" name="reasonCategory" required>
          {reasonCategories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-xs font-medium text-slate-700">Internal note</span>
        <textarea className="min-h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" maxLength={500} name="internalNote" />
      </label>
      {mode === "remove" ? (
        <label className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <input className="mt-0.5" name="confirm" required type="checkbox" value="remove" />
          <span>Confirm Unlimited removal.</span>
        </label>
      ) : null}
      <ActionMessage state={state} />
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : mode === "grant_one_year" ? "Grant Unlimited" : "Remove Unlimited"}
      </Button>
    </form>
  );
}

function RecentLedgerEvents({ events }: { events: AdminUserCreditLookup["recentLedgerEvents"] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <h3 className="text-sm font-semibold text-slate-900">Recent credit ledger events</h3>
      <div className="mt-3 space-y-2">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No recent ledger events.</p>
        ) : (
          events.map((event) => (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs" key={event.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">{event.reason}</span>
                <span className={event.delta >= 0 ? "text-emerald-700" : "text-rose-700"}>{event.delta > 0 ? `+${event.delta}` : event.delta}</span>
              </div>
              <p className="mt-1 text-slate-500">Balance after {event.balanceAfter} · {formatDateTime(event.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReportsSection({
  tickets,
  selectedTicket,
  activeStatus,
  action,
}: Pick<AdminSupportConsoleProps, "tickets" | "selectedTicket" | "activeStatus" | "action">) {
  const listHref = `/admin/support?tab=reports${activeStatus === "active" ? "" : `&status=${activeStatus}`}`;

  return (
    <div className="space-y-4">
      <div className={`flex gap-2 overflow-x-auto px-1 pb-2 ${selectedTicket ? "hidden md:flex" : ""}`} data-testid="admin-support-status-filters">
        {statusFilters.map((status) => (
          <Link
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              activeStatus === status ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"
            }`}
            href={`/admin/support?tab=reports${status === "active" ? "" : `&status=${status}`}`}
            key={status}
          >
            {statusLabels[status]}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className={`space-y-2 ${selectedTicket ? "hidden md:block" : ""}`} data-testid="admin-support-ticket-list">
          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">No support tickets in this view.</p>
          ) : (
            tickets.map((ticket) => (
              <Link
                className={`block rounded-2xl border bg-white px-3 py-3 transition hover:bg-slate-50 ${
                  selectedTicket?.id === ticket.id ? "border-sky-200 shadow-calm" : "border-slate-200"
                }`}
                href={`/admin/support?${new URLSearchParams({
                  tab: "reports",
                  ...(activeStatus !== "active" ? { status: activeStatus } : {}),
                  ticket: ticket.id,
                }).toString()}`}
                key={ticket.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject || categoryLabels[ticket.category]}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{ticket.userEmail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClass(ticket.status)}`}>
                    {statusLabels[ticket.status]}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{categoryLabels[ticket.category]}</span>
                  <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                </div>
                {ticket.attachments.length > 0 ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <ImageIcon aria-hidden="true" className="size-3.5" />
                    {ticket.attachments.length} screenshot{ticket.attachments.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </Link>
            ))
          )}
        </div>

        <div className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 ${selectedTicket ? "" : "hidden md:block"}`} data-testid="admin-support-ticket-detail">
          {selectedTicket ? <TicketDetail action={action} closeHref={listHref} ticket={selectedTicket} /> : <p className="text-sm text-slate-500">Select a ticket to review.</p>}
        </div>
      </div>
    </div>
  );
}

function TicketDetail({ ticket, closeHref, action }: { ticket: SupportTicket; closeHref: string; action: AdminSupportConsoleProps["action"] }) {
  const [state, formAction, isPending] = useActionState(action, initialAdminSupportTicketActionState);
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>(ticket.status);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTechnicalOpen, setIsTechnicalOpen] = useState(false);

  useEffect(() => {
    setSelectedStatus(ticket.status);
    setIsStatusOpen(false);
    setIsTechnicalOpen(false);
  }, [ticket.id, ticket.status]);

  return (
    <div className="space-y-4">
      <Link aria-label="Back to tickets" className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 md:hidden" href={closeHref}>
        Back to tickets
      </Link>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Ticket detail</p>
        <h3 className="text-lg font-semibold text-slate-900">{ticket.subject || categoryLabels[ticket.category]}</h3>
        <p className="break-all text-xs text-slate-500">{ticket.userEmail}</p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">{ticket.message}</div>

      <MetadataGroup title="User">
        <MetaRow label="Email" value={ticket.userEmail} />
        <MetaRow label="Locale" value={ticket.locale ?? "-"} />
      </MetadataGroup>
      <MetadataGroup title="Environment">
        <MetaRow label="Route" value={ticket.sourceRoute ?? "-"} />
        <MetaRow label="App version" value={ticket.appVersion ?? "-"} />
        <MetaRow label="Browser/platform" value={ticket.platformSummary ?? "-"} />
        <MetaRow label="Viewport" value={ticket.viewportWidth && ticket.viewportHeight ? `${ticket.viewportWidth} × ${ticket.viewportHeight}` : "-"} />
        <MetaRow label="Mode" value={ticket.pwaDisplayMode ?? "-"} />
        <MetaRow label="Timezone" value={ticket.timezone ?? "-"} />
        <MetaRow label="Connection" value={ticket.onlineState ?? "-"} />
      </MetadataGroup>
      <MetadataGroup title="Timeline">
        <MetaRow label="Created" value={formatDate(ticket.createdAt)} />
        <MetaRow label="Updated" value={formatDate(ticket.updatedAt)} />
        <MetaRow label="Resolved" value={ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "-"} />
        <MetaRow label="Closed" value={ticket.closedAt ? formatDate(ticket.closedAt) : "-"} />
        <MetaRow label="Archived" value={ticket.archivedAt ? formatDate(ticket.archivedAt) : "-"} />
      </MetadataGroup>

      <div className="rounded-xl border border-slate-200">
        <button className="flex min-h-10 w-full items-center justify-between px-3 text-left text-xs font-semibold text-slate-600" onClick={() => setIsTechnicalOpen((value) => !value)} type="button" aria-expanded={isTechnicalOpen}>
          Technical details
          <ChevronDown aria-hidden="true" className={`size-4 transition ${isTechnicalOpen ? "rotate-180" : ""}`} />
        </button>
        {isTechnicalOpen ? <div className="border-t border-slate-100 px-3 py-2 text-xs break-words text-slate-500">{ticket.userAgent ?? "-"}</div> : null}
      </div>

      {ticket.attachments.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-medium text-slate-700">Screenshots</p>
          <div className="grid grid-cols-3 gap-2">
            {ticket.attachments.map((attachment) => (
              <a className="group block aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50" href={`/api/admin/support-attachments/${attachment.id}`} key={attachment.id} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Support screenshot preview" className="h-full w-full object-cover transition group-hover:scale-105" src={`/api/admin/support-attachments/${attachment.id}`} />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input name="ticketId" type="hidden" value={ticket.id} />
        <div className="space-y-1.5">
          <input name="status" type="hidden" value={selectedStatus} />
          <span className="block text-xs font-medium text-slate-700" id={`support-status-label-${ticket.id}`}>Status</span>
          <button aria-expanded={isStatusOpen} aria-labelledby={`support-status-label-${ticket.id} support-status-value-${ticket.id}`} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-900 transition hover:bg-white focus:border-sky-300 focus:bg-white focus:outline-none" onClick={() => setIsStatusOpen((value) => !value)} type="button">
            <span id={`support-status-value-${ticket.id}`}>{statusLabels[selectedStatus]}</span>
            <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen ? (
            <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {editableStatuses.map((status) => {
                const isSelected = status === selectedStatus;
                return (
                  <button aria-pressed={isSelected} className={`flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"}`} key={status} onClick={() => { setSelectedStatus(status); setIsStatusOpen(false); }} type="button">
                    <span>{statusLabels[status]}</span>
                    {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">Internal note</span>
          <textarea className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" maxLength={2000} name="adminNote" defaultValue={ticket.adminNote ?? ""} />
        </label>
        <ActionMessage state={state} />
        <Button className="w-full" disabled={isPending} type="submit">{isPending ? "Saving..." : "Save support update"}</Button>
      </form>
    </div>
  );
}

function MetadataGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <dl className="grid gap-2 text-xs text-slate-600">{children}</dl>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl bg-slate-50 px-3 py-2">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="break-words text-slate-700">{value}</dd>
    </div>
  );
}

function ActionMessage({ state }: { state: AdminSupportTicketActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return <p className={`rounded-xl px-3 py-2 text-xs ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDateTime(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function getStatusClass(status: SupportStatus) {
  if (status === "new") return "bg-sky-50 text-sky-700";
  if (status === "in_progress") return "bg-amber-50 text-amber-700";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}
