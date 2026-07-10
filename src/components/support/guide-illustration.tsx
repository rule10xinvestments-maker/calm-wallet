"use client";

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
const slate = "#64748b";
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
      return <TrackedBalanceVisual />;
    case "recurring":
      return <RecurringVisual />;
    case "limits":
      return <LimitsVisual />;
  }
}

function QuickAddVisual({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 text-center text-[0.64rem] font-semibold text-slate-600">
      <VisualPill>{t("help.visuals.quickAdd.input", locale)}</VisualPill>
      <Arrow />
      <VisualPill>{t("help.visuals.quickAdd.understands", locale)}</VisualPill>
      <Arrow />
      <VisualPill>{t("help.visuals.quickAdd.saved", locale)}</VisualPill>
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
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-[0.64rem] text-slate-500 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="h-2.5 w-20 rounded-full bg-slate-200" />
          <div className="mt-2 h-2 w-12 rounded-full bg-sky-100" />
        </div>
        <span className="rounded-full bg-sky-100 px-2 py-1 font-semibold text-sky-700">{t("help.visuals.activity.category", locale)}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 font-semibold">
        <span className="min-w-0 break-words rounded-lg bg-slate-50 px-1.5 py-1 text-center">{t("help.visuals.activity.edit", locale)}</span>
        <span className="min-w-0 break-words rounded-lg bg-slate-50 px-1.5 py-1 text-center">{t("help.visuals.activity.note", locale)}</span>
        <span className="min-w-0 break-words rounded-lg bg-rose-50 px-1.5 py-1 text-center text-rose-600">{t("help.visuals.activity.delete", locale)}</span>
        <span className="min-w-0 break-words rounded-lg bg-emerald-50 px-1.5 py-1 text-center text-emerald-700">{t("help.visuals.activity.restore", locale)}</span>
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

function TrackedBalanceVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <rect x="40" y="22" width="54" height="56" rx="8" fill="white" stroke={midBlue} strokeWidth="3" />
      <path d="M54 38h26M54 50h20M54 62h24" stroke={softSlate} strokeLinecap="round" strokeWidth="4" />
      <path d="M107 42l16 16M123 42l-16 16" stroke={slate} strokeLinecap="round" strokeWidth="4" />
      <rect x="140" y="30" width="48" height="36" rx="8" fill="white" stroke={softSlate} strokeWidth="3" />
      <rect x="148" y="39" width="32" height="6" rx="3" fill={softSlate} />
      <rect x="148" y="52" width="20" height="6" rx="3" fill={softBlue} />
    </svg>
  );
}

function RecurringVisual() {
  return (
    <svg className="h-24 w-full" viewBox="0 0 220 96">
      <rect x="56" y="24" width="108" height="56" rx="10" fill="white" stroke={softSlate} strokeWidth="3" />
      <rect x="56" y="24" width="108" height="16" rx="10" fill={softBlue} />
      <circle cx="80" cy="54" r="6" fill={midBlue} />
      <circle cx="110" cy="54" r="6" fill={softSlate} />
      <circle cx="140" cy="54" r="6" fill={green} />
      <path d="M91 70a22 22 0 0 0 38 0" fill="none" stroke={deepBlue} strokeLinecap="round" strokeWidth="4" />
      <path d="M130 62v10h-10" fill="none" stroke={deepBlue} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </svg>
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

function VisualPill({ children }: { children: ReactNode }) {
  return <span className="min-w-0 break-words rounded-xl border border-sky-100 bg-white px-2 py-2 shadow-sm">{children}</span>;
}

function Arrow() {
  return <span className="text-sky-500">-&gt;</span>;
}
