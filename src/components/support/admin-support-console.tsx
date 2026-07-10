"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { initialAdminSupportTicketActionState, type AdminSupportTicketActionState } from "@/lib/actions/support-state";
import type { SupportStatus, SupportTicket } from "@/domain/support/types";
import { t, type SupportedLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type AdminSupportConsoleProps = {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  activeStatus: SupportStatus | "all";
  locale: SupportedLocale;
  action: (state: AdminSupportTicketActionState, formData: FormData) => Promise<AdminSupportTicketActionState>;
};

const statusFilters: Array<SupportStatus | "all"> = ["all", "new", "in_progress", "resolved", "closed"];
const editableStatuses: SupportStatus[] = ["new", "in_progress", "resolved", "closed"];

export function AdminSupportConsole({ tickets, selectedTicket, activeStatus, locale, action }: AdminSupportConsoleProps) {
  const listHref = `/admin/support${activeStatus === "all" ? "" : `?status=${activeStatus}`}`;

  return (
    <section className="space-y-4">
      <header className={`space-y-2 ${selectedTicket ? "hidden md:block" : ""}`}>
        <p className="text-sm font-medium text-sky-700">{t("admin.support.eyebrow", locale)}</p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{t("admin.support.title", locale)}</h2>
        <p className="text-sm leading-6 text-slate-500">{t("admin.support.helper", locale)}</p>
      </header>

      <div className={`flex gap-2 overflow-x-auto pb-1 ${selectedTicket ? "hidden md:flex" : ""}`}>
        {statusFilters.map((status) => (
          <Link
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              activeStatus === status ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"
            }`}
            href={`/admin/support${status === "all" ? "" : `?status=${status}`}`}
            key={status}
          >
            {t(`admin.support.statusFilters.${status}`, locale)}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className={`space-y-2 ${selectedTicket ? "hidden md:block" : ""}`} data-testid="admin-support-ticket-list">
          {tickets.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
              {t("admin.support.empty", locale)}
            </p>
          ) : (
            tickets.map((ticket) => (
              <Link
                className={`block rounded-2xl border bg-white px-3 py-3 transition hover:bg-slate-50 ${
                  selectedTicket?.id === ticket.id ? "border-sky-200 shadow-calm" : "border-slate-200"
                }`}
                href={`/admin/support?${new URLSearchParams({
                  ...(activeStatus !== "all" ? { status: activeStatus } : {}),
                  ticket: ticket.id,
                }).toString()}`}
                key={ticket.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{ticket.subject || t(`settings.support.categories.${ticket.category}`, locale)}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{ticket.userEmail}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClass(ticket.status)}`}>
                    {t(`admin.support.statuses.${ticket.status}`, locale)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{t(`settings.support.categories.${ticket.category}`, locale)}</span>
                  <time dateTime={ticket.createdAt}>{formatDate(ticket.createdAt)}</time>
                </div>
              </Link>
            ))
          )}
        </div>

        <div
          className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 ${selectedTicket ? "" : "hidden md:block"}`}
          data-testid="admin-support-ticket-detail"
        >
          {selectedTicket ? (
            <TicketDetail action={action} closeHref={listHref} locale={locale} ticket={selectedTicket} />
          ) : (
            <p className="text-sm text-slate-500">{t("admin.support.selectTicket", locale)}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function TicketDetail({
  ticket,
  closeHref,
  locale,
  action,
}: {
  ticket: SupportTicket;
  closeHref: string;
  locale: SupportedLocale;
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
        aria-label={t("admin.support.backToList", locale)}
        className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 md:hidden"
        href={closeHref}
      >
        {t("admin.support.backToList", locale)}
      </Link>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{t("admin.support.ticketDetail", locale)}</p>
        <h3 className="text-lg font-semibold text-slate-900">{ticket.subject || t(`settings.support.categories.${ticket.category}`, locale)}</h3>
        <p className="text-xs text-slate-500">{ticket.userEmail}</p>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
        {ticket.message}
      </div>

      <dl className="grid gap-2 text-xs text-slate-600">
        <MetaRow label={t("admin.support.userId", locale)} value={ticket.userId} />
        <MetaRow label={t("admin.support.locale", locale)} value={ticket.locale ?? "-"} />
        <MetaRow label={t("admin.support.route", locale)} value={ticket.sourceRoute ?? "-"} />
        <MetaRow label={t("admin.support.userAgent", locale)} value={ticket.userAgent ?? "-"} />
        <MetaRow label={t("admin.support.created", locale)} value={formatDate(ticket.createdAt)} />
        <MetaRow label={t("admin.support.updated", locale)} value={formatDate(ticket.updatedAt)} />
      </dl>

      <form action={formAction} className="space-y-3">
        <input name="ticketId" type="hidden" value={ticket.id} />
        <div className="space-y-1.5">
          <input name="status" type="hidden" value={selectedStatus} />
          <span className="block text-xs font-medium text-slate-700" id={`support-status-label-${ticket.id}`}>
            {t("admin.support.status", locale)}
          </span>
          <button
            aria-expanded={isStatusOpen}
            aria-labelledby={`support-status-label-${ticket.id} support-status-value-${ticket.id}`}
            className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-900 transition hover:bg-white focus:border-sky-300 focus:bg-white focus:outline-none"
            onClick={() => setIsStatusOpen((value) => !value)}
            type="button"
          >
            <span id={`support-status-value-${ticket.id}`}>{t(`admin.support.statuses.${selectedStatus}`, locale)}</span>
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
                    <span>{t(`admin.support.statuses.${status}`, locale)}</span>
                    {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-700">{t("admin.support.internalNote", locale)}</span>
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
          {isPending ? t("common.saving", locale) : t("admin.support.save", locale)}
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
