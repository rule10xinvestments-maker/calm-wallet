"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Image as ImageIcon } from "lucide-react";
import { initialAdminSupportTicketActionState, type AdminSupportTicketActionState } from "@/lib/actions/support-state";
import type { SupportStatus, SupportTicket } from "@/domain/support/types";
import { Button } from "@/components/ui/button";

type AdminSupportConsoleProps = {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  activeStatus: SupportStatus | "active" | "all";
  action: (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;
};

const statusFilters: Array<SupportStatus | "active" | "all"> = ["active", "new", "in_progress", "resolved", "closed", "archived", "all"];
const editableStatuses: SupportStatus[] = ["new", "in_progress", "resolved"];
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

export function AdminSupportConsole({ tickets, selectedTicket, activeStatus, action }: AdminSupportConsoleProps) {
  const listHref = `/admin/support${activeStatus === "active" ? "" : `?status=${activeStatus}`}`;

  return (
    <section className="space-y-4">
      <header className={`space-y-2 ${selectedTicket ? "hidden md:block" : ""}`}>
        <p className="text-sm font-medium text-sky-700">Admin</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Support</h2>
        <p className="text-sm leading-6 text-slate-500">Review and manage user reports.</p>
      </header>

      <div className={`flex gap-2 overflow-x-auto pb-1 ${selectedTicket ? "hidden md:flex" : ""}`}>
        {statusFilters.map((status) => (
          <Link
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              activeStatus === status ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"
            }`}
            href={`/admin/support${status === "active" ? "" : `?status=${status}`}`}
            key={status}
          >
            {statusLabels[status]}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className={`space-y-2 ${selectedTicket ? "hidden md:block" : ""}`} data-testid="admin-support-ticket-list">
          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
              No support tickets in this view.
            </p>
          ) : (
            tickets.map((ticket) => (
              <Link
                className={`block rounded-2xl border bg-white px-3 py-3 transition hover:bg-slate-50 ${
                  selectedTicket?.id === ticket.id ? "border-sky-200 shadow-calm" : "border-slate-200"
                }`}
                href={`/admin/support?${new URLSearchParams({
                  ...(activeStatus !== "active" ? { status: activeStatus } : {}),
                  ticket: ticket.id,
                }).toString()}`}
                key={ticket.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject || categoryLabels[ticket.category]}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{ticket.userEmail}</p>
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

        <div
          className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 ${selectedTicket ? "" : "hidden md:block"}`}
          data-testid="admin-support-ticket-detail"
        >
          {selectedTicket ? (
            <TicketDetail action={action} closeHref={listHref} ticket={selectedTicket} />
          ) : (
            <p className="text-sm text-slate-500">Select a ticket to review.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function TicketDetail({
  ticket,
  closeHref,
  action,
}: {
  ticket: SupportTicket;
  closeHref: string;
  action: AdminSupportConsoleProps["action"];
}) {
  const [state, formAction, isPending] = useActionState(action, initialAdminSupportTicketActionState);
  const [selectedStatus, setSelectedStatus] = useState<SupportStatus>(ticket.status);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  useEffect(() => {
    setSelectedStatus(ticket.status);
    setIsStatusOpen(false);
  }, [ticket.id, ticket.status]);

  return (
    <div className="space-y-4">
      <Link
        aria-label="Back to tickets"
        className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 md:hidden"
        href={closeHref}
      >
        Back to tickets
      </Link>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Ticket detail</p>
        <h3 className="text-lg font-semibold text-slate-900">{ticket.subject || categoryLabels[ticket.category]}</h3>
        <p className="text-xs text-slate-500">{ticket.userEmail}</p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
        {ticket.message}
      </div>

      <dl className="grid gap-2 text-xs text-slate-600">
        <MetaRow label="User ID" value={ticket.userId} />
        <MetaRow label="User email" value={ticket.userEmail} />
        <MetaRow label="Category" value={categoryLabels[ticket.category]} />
        <MetaRow label="Locale" value={ticket.locale ?? "-"} />
        <MetaRow label="Route" value={ticket.sourceRoute ?? "-"} />
        <MetaRow label="User agent" value={ticket.userAgent ?? "-"} />
        <MetaRow label="Created" value={formatDate(ticket.createdAt)} />
        <MetaRow label="Updated" value={formatDate(ticket.updatedAt)} />
        <MetaRow label="Resolved" value={ticket.resolvedAt ? formatDate(ticket.resolvedAt) : "-"} />
        <MetaRow label="Closed" value={ticket.closedAt ? formatDate(ticket.closedAt) : "-"} />
        <MetaRow label="Archived" value={ticket.archivedAt ? formatDate(ticket.archivedAt) : "-"} />
      </dl>

      {ticket.attachments.length > 0 ? (
        <section className="space-y-2">
          <p className="text-xs font-medium text-slate-700">Screenshots</p>
          <div className="grid grid-cols-3 gap-2">
            {ticket.attachments.map((attachment) => (
              <a
                className="group block aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                href={`/api/admin/support-attachments/${attachment.id}`}
                key={attachment.id}
                target="_blank"
                rel="noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Support screenshot preview"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  src={`/api/admin/support-attachments/${attachment.id}`}
                />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input name="ticketId" type="hidden" value={ticket.id} />
        <div className="space-y-1.5">
          <input name="status" type="hidden" value={selectedStatus} />
          <span className="block text-xs font-medium text-slate-700" id={`support-status-label-${ticket.id}`}>
            Status
          </span>
          <button
            aria-expanded={isStatusOpen}
            aria-labelledby={`support-status-label-${ticket.id} support-status-value-${ticket.id}`}
            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-900 transition hover:bg-white focus:border-sky-300 focus:bg-white focus:outline-none"
            onClick={() => setIsStatusOpen((value) => !value)}
            type="button"
          >
            <span id={`support-status-value-${ticket.id}`}>{statusLabels[selectedStatus]}</span>
            <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition ${isStatusOpen ? "rotate-180" : ""}`} />
          </button>
          {isStatusOpen ? (
            <div className="grid gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {editableStatuses.map((status) => {
                const isSelected = status === selectedStatus;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status);
                      setIsStatusOpen(false);
                    }}
                    type="button"
                  >
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
          <textarea
            className="min-h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            maxLength={2000}
            name="adminNote"
            defaultValue={ticket.adminNote ?? ""}
          />
        </label>
        {state.status !== "idle" && state.message ? (
          <p className={`rounded-xl px-3 py-2 text-xs ${state.status === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {state.message}
          </p>
        ) : null}
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "Saving..." : "Save support update"}
        </Button>
      </form>
    </div>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusClass(status: SupportStatus) {
  if (status === "new") return "bg-sky-50 text-sky-700";
  if (status === "in_progress") return "bg-amber-50 text-amber-700";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}
