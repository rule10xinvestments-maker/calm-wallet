"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Coffee, Landmark, NotebookText, Pencil, ReceiptText, Repeat2, RotateCcw, StickyNote, Tag, Trash2, Utensils } from "lucide-react";
import { t } from "@/lib/i18n";
import type { ReactNode } from "react";
import type { SupportedLocale } from "@/lib/i18n";

export const GUIDE_VISUALS_ENABLED = true;

export type GuideIllustrationKind =
  | "quickAdd"
  | "needsReview"
  | "activity"
  | "mix"
  | "bars"
  | "trend"
  | "trackedBalance"
  | "recurring"
  | "limits";

type GuideIllustrationProps = {
  kind?: GuideIllustrationKind;
  locale: SupportedLocale;
  enabled?: boolean;
};

const softBlue = "#dbeafe";
const midBlue = "#7dd3fc";
const deepBlue = "#0369a1";
const softSlate = "#e2e8f0";
const green = "#86efac";
const rose = "#fecdd3";

export function GuideIllustration({ kind, locale, enabled = GUIDE_VISUALS_ENABLED }: GuideIllustrationProps) {
  if (!enabled || !kind) return null;

  const caption = t(`help.visuals.${kind}.caption`, locale);

  return (
    <figure
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-sky-100 bg-sky-50 px-3 py-3"
      data-testid={`guide-illustration-${kind}`}
    >
      <div className="mx-auto w-full max-w-[15rem]">{renderVisual(kind, locale)}</div>
      <figcaption className="mt-2 text-center text-[0.72rem] font-medium leading-5 text-slate-500">{caption}</figcaption>
    </figure>
  );
}

function renderVisual(kind: GuideIllustrationKind, locale: SupportedLocale) {
  switch (kind) {
    case "quickAdd":
      return <QuickAddVisual locale={locale} />;
    case "needsReview":
      return <NeedsReviewVisual locale={locale} />;
    case "activity":
      return <ActivityVisual locale={locale} />;
    case "mix":
      return <MixVisual />;
    case "bars":
      return <BarsVisual />;
    case "trend":
      return <TrendVisual />;
    case "trackedBalance":
      return <TrackedBalanceVisual locale={locale} />;
    case "recurring":
      return <RecurringVisual locale={locale} />;
    case "limits":
      return <LimitsVisual />;
  }
}

function QuickAddVisual({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="space-y-2 text-[0.62rem] font-semibold text-slate-600" data-testid="guide-quickadd-flow">
      <div
        className="ml-1 w-fit max-w-full rounded-2xl rounded-bl-md border border-sky-100 bg-white px-3 py-2 text-[0.76rem] font-semibold text-slate-800 shadow-sm"
        data-testid="guide-quickadd-message"
      >
        {t("help.visuals.quickAdd.input", locale)}
      </div>

      <Connector />

      <div className="flex flex-wrap items-center justify-center gap-1.5" data-testid="guide-quickadd-interpretation">
        <InterpretationChip icon={<ReceiptText aria-hidden="true" className="size-3.5" />} label={t("help.visuals.quickAdd.spend", locale)} />
        <span className="shrink-0 rounded-full border border-slate-100 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-slate-800 shadow-sm">
          {t("help.visuals.quickAdd.amount", locale)}
        </span>
        <InterpretationChip icon={<Utensils aria-hidden="true" className="size-3.5" />} label={t("help.visuals.quickAdd.category", locale)} />
      </div>

      <Connector />

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm" data-testid="guide-quickadd-saved-card">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Coffee aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.76rem] font-semibold text-slate-800">{t("help.visuals.quickAdd.merchant", locale)}</span>
            <span className="mt-0.5 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[0.56rem] font-semibold text-sky-700">
              {t("help.visuals.quickAdd.category", locale)}
            </span>
          </span>
          <span className="shrink-0 text-[0.72rem] font-bold text-rose-600">{t("help.visuals.quickAdd.savedAmount", locale)}</span>
        </div>
      </div>

      <div className="ml-auto flex w-fit max-w-full items-center gap-1.5 rounded-full border border-amber-100 bg-white px-2 py-1 text-[0.56rem] font-semibold text-amber-700" data-testid="guide-quickadd-review-detail">
        <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">{t("help.visuals.quickAdd.reviewExample", locale)}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5">
          <CheckCircle2 aria-hidden="true" className="size-3" />
          {t("help.visuals.quickAdd.needsReview", locale)}
        </span>
      </div>
    </div>
  );
}

function NeedsReviewVisual({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="space-y-2 text-[0.64rem] font-semibold text-slate-600">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <VisualPill>{t("help.visuals.needsReview.saved", locale)}</VisualPill>
        <Arrow />
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-center text-amber-700">
          {t("help.visuals.needsReview.badge", locale)}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <VisualPill>{t("help.visuals.needsReview.edit", locale)}</VisualPill>
        <Arrow />
        <VisualPill>{t("help.visuals.needsReview.update", locale)}</VisualPill>
      </div>
    </div>
  );
}

function ActivityVisual({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="space-y-2 text-[0.62rem] font-semibold text-slate-500">
      <div
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
        data-testid="guide-activity-transaction-card"
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Coffee aria-hidden="true" className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.76rem] font-semibold text-slate-800">{t("help.visuals.activity.merchant", locale)}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.62rem] font-medium text-slate-500">
              <span>{t("help.visuals.activity.amount", locale)}</span>
              <span aria-hidden="true">•</span>
              <span>{t("help.visuals.activity.date", locale)}</span>
            </span>
          </span>
          <span className="rounded-full bg-sky-100 px-2 py-1 text-[0.58rem] font-semibold text-sky-700">{t("help.visuals.activity.category", locale)}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5" data-testid="guide-activity-actions">
        <ActionCallout icon={<Tag aria-hidden="true" className="size-3.5" />} label={t("help.visuals.activity.categoryAction", locale)} />
        <ActionCallout icon={<Pencil aria-hidden="true" className="size-3.5" />} label={t("help.visuals.activity.edit", locale)} />
        <ActionCallout icon={<StickyNote aria-hidden="true" className="size-3.5" />} label={t("help.visuals.activity.note", locale)} />
        <ActionCallout icon={<Trash2 aria-hidden="true" className="size-3.5" />} label={t("help.visuals.activity.delete", locale)} tone="danger" />
      </div>

      <div
        className="ml-auto flex w-fit items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-2 py-1 text-[0.58rem] font-semibold text-emerald-700"
        data-testid="guide-activity-restore-callout"
      >
        <RotateCcw aria-hidden="true" className="size-3.5" />
        <span>{t("help.visuals.activity.restore", locale)}</span>
      </div>
    </div>
  );
}

function MixVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <circle cx="110" cy="48" r="28" fill="none" stroke={softSlate} strokeWidth="16" />
      <path d="M110 20a28 28 0 0 1 24 42" fill="none" stroke={midBlue} strokeLinecap="round" strokeWidth="16" />
      <path d="M88 65a28 28 0 0 1 4-38" fill="none" stroke={softBlue} strokeLinecap="round" strokeWidth="16" />
      <circle cx="110" cy="48" r="12" fill="white" />
      <rect x="150" y="32" width="36" height="8" rx="4" fill={midBlue} />
      <rect x="150" y="48" width="24" height="8" rx="4" fill={softSlate} />
      <rect x="150" y="64" width="30" height="8" rx="4" fill={softSlate} />
    </svg>
  );
}

function BarsVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <line x1="24" x2="196" y1="78" y2="78" stroke={softSlate} strokeWidth="2" />
      {[36, 72, 108, 144, 180].map((x, index) => (
        <g key={x}>
          <rect x={x - 9} y={index === 2 ? 30 : 44 + (index % 2) * 7} width="8" height={index === 2 ? 48 : 34 - (index % 2) * 6} rx="4" fill={index === 2 ? midBlue : softBlue} />
          <rect x={x + 2} y={index === 2 ? 48 : 58 - (index % 2) * 5} width="8" height={index === 2 ? 30 : 20 + (index % 2) * 5} rx="4" fill={index === 2 ? deepBlue : softSlate} />
        </g>
      ))}
      <rect x="92" y="20" width="32" height="62" rx="8" fill="none" stroke={midBlue} strokeWidth="2" />
    </svg>
  );
}

function TrendVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <line x1="24" x2="196" y1="78" y2="78" stroke={softSlate} strokeWidth="2" />
      <line x1="24" x2="24" y1="18" y2="78" stroke={softSlate} strokeWidth="2" />
      <path d="M28 58 C58 48 70 38 98 42 S145 25 190 28" fill="none" stroke={deepBlue} strokeLinecap="round" strokeWidth="4" />
      <path d="M28 66 C60 62 74 68 104 58 S148 54 190 46" fill="none" stroke={rose} strokeLinecap="round" strokeWidth="4" />
      <circle cx="190" cy="28" r="4" fill={deepBlue} />
      <circle cx="190" cy="46" r="4" fill="#fb7185" />
    </svg>
  );
}

function TrackedBalanceVisual({ locale }: { locale: SupportedLocale }) {
  return <TrackedBalanceCards locale={locale} />;
}

function TrackedBalanceCards({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-[0.62rem] font-semibold text-slate-600">
      <div className="rounded-xl border border-sky-100 bg-white p-2 shadow-sm" data-testid="guide-tracked-notebook">
        <NotebookText aria-hidden="true" className="mx-auto size-6 text-sky-700" />
        <div className="mt-1.5 space-y-1">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-emerald-100" />
          <div className="mx-auto h-1.5 w-10 rounded-full bg-rose-100" />
          <div className="mx-auto h-1.5 w-11 rounded-full bg-sky-100" />
        </div>
        <p className="mt-2 break-words leading-4">{t("help.visuals.trackedBalance.trackedEntries", locale)}</p>
      </div>
      <span className="text-lg font-bold text-slate-500" data-testid="guide-tracked-not-equal">
        ≠
      </span>
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm" data-testid="guide-tracked-bank">
        <Landmark aria-hidden="true" className="mx-auto size-6 text-slate-500" />
        <div className="mt-1.5 space-y-1">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="mx-auto h-1.5 w-9 rounded-full bg-slate-100" />
        </div>
        <p className="mt-2 break-words leading-4">{t("help.visuals.trackedBalance.bank", locale)}</p>
      </div>
    </div>
  );
}

function RecurringVisual({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="space-y-2 text-[0.62rem] font-semibold text-slate-600" data-testid="guide-recurring-timeline">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Repeat2 aria-hidden="true" className="size-4" />
          </span>
          <span className="leading-4">{t("help.visuals.recurring.rule", locale)}</span>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[0.58rem] text-emerald-700">{t("help.visuals.recurring.monthly", locale)}</span>
      </div>

      <div className="grid grid-cols-3 items-start gap-1.5">
        {["one", "two", "three"].map((month) => (
          <div className="relative rounded-xl border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm" data-testid="guide-recurring-entry" key={month}>
            <CalendarDays aria-hidden="true" className="mx-auto size-4 text-sky-700" />
            <p className="mt-1 text-[0.56rem] text-slate-400">{t(`help.visuals.recurring.months.${month}`, locale)}</p>
            <p className="mt-1 truncate text-[0.66rem] text-slate-800">{t("help.visuals.recurring.salary", locale)}</p>
            <p className="text-[0.56rem] text-slate-500">{t("help.visuals.recurring.amount", locale)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LimitsVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <rect x="50" y="38" width="120" height="16" rx="8" fill={softSlate} />
      <rect x="50" y="38" width="84" height="16" rx="8" fill={midBlue} />
      <circle cx="134" cy="46" r="12" fill="white" stroke={deepBlue} strokeWidth="3" />
      <path d="M70 66h80" stroke={softSlate} strokeLinecap="round" strokeWidth="5" />
      <path d="M70 66h56" stroke={green} strokeLinecap="round" strokeWidth="5" />
    </svg>
  );
}

function ActionCallout({ icon, label, tone = "neutral" }: { icon: ReactNode; label: string; tone?: "neutral" | "danger" }) {
  const toneClass = tone === "danger" ? "bg-rose-50 text-rose-600" : "bg-white text-sky-700";

  return (
    <span className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border border-slate-100 px-1 py-1.5 text-center leading-3 shadow-sm ${toneClass}`}>
      {icon}
      <span className="max-w-full whitespace-normal break-keep text-[0.55rem] leading-3">{label}</span>
    </span>
  );
}

function InterpretationChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-100 bg-white px-2 py-1 text-[0.62rem] font-semibold text-sky-700 shadow-sm">
      {icon}
      <span>{label}</span>
    </span>
  );
}

function Connector() {
  return (
    <div className="flex justify-center text-sky-500" aria-hidden="true">
      <span className="h-3 border-l border-dashed border-sky-300" />
    </div>
  );
}

function VisualPill({ children }: { children: ReactNode }) {
  return <span className="min-w-0 break-words rounded-xl border border-sky-100 bg-white px-2 py-2 shadow-sm">{children}</span>;
}

function Arrow() {
  return <span className="text-sky-500">-&gt;</span>;
}
