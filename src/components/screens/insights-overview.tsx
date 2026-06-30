"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Eye,
  Info,
  Repeat2,
  X,
} from "lucide-react";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BudgetActionState } from "@/lib/actions/budgets-state";
import { getCategoryVisualsByName } from "@/lib/category-icons";
import type { InsightsData } from "@/lib/server/transactions-read-model";
import { formatTransactionTitleForDisplay } from "@/lib/utils";

type SpendingMixSegment = "expenses" | "income";

type SpendingMixCategoryItem = InsightsData["categoryBreakdown"][number];
type TrendCategoryItem = SpendingMixCategoryItem & {
  incomeMinor?: number;
  incomeDisplay?: string;
  expenseMinor?: number;
  expenseDisplay?: string;
  netMinor?: number;
  netDisplay?: string;
  movementMinor?: number;
};
type MonthPickerMonth = InsightsData["monthPickerYears"][number]["months"][number];
type ChartMode = InsightsData["selectedChartMode"];

type InsightsQueryButtonProps = {
  "aria-current"?: "date" | "true";
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  children: ReactNode;
  className: string;
  href: string;
  onSelect: () => void;
};

type InsightsSelectionUpdate = {
  chart?: ChartMode;
  currency?: string;
  month?: string;
  timeframe?: InsightsData["selectedTimeframe"];
};

type InsightsOverviewProps = {
  data: InsightsData;
  upsertBudgetAction: (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
  deleteBudgetAction: (state: BudgetActionState, formData: FormData) => Promise<BudgetActionState>;
  loadError?: boolean;
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

function formatOriginalCurrencyAmount(amountMinor: number, currency: string) {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);

  return `${currency} ${amount}`;
}

function getApproxPrefix(data: InsightsData, amountMinor: number) {
  return data.hasConvertedCurrencies && amountMinor !== 0 ? "≈ " : "";
}

function preventMouseFocus(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function getDesktopScrollSnapshot() {
  if (typeof window === "undefined" || window.innerWidth < 768 || window.scrollY <= 0) {
    return null;
  }

  return {
    x: window.scrollX,
    y: window.scrollY,
  };
}

function restoreDesktopScroll(snapshot: { x: number; y: number } | null) {
  if (!snapshot || typeof window === "undefined") {
    return;
  }

  const restore = () => {
    window.scrollTo({ behavior: "auto", left: snapshot.x, top: snapshot.y });
  };
  const requestFrame =
    window.requestAnimationFrame?.bind(window) ??
    ((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 0));

  restore();
  requestFrame(() => {
    restore();
    requestFrame(restore);
  });
  window.setTimeout(restore, 120);
}

function InsightsQueryButton({
  "aria-current": ariaCurrent,
  "aria-label": ariaLabel,
  "aria-pressed": ariaPressed,
  children,
  className,
  href,
  onSelect,
}: InsightsQueryButtonProps) {
  return (
    <button
      aria-current={ariaCurrent}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={className}
      data-href={href}
      data-scroll-preserve="true"
      onClick={(event) => {
        const scrollSnapshot = getDesktopScrollSnapshot();

        event.currentTarget.blur();
        onSelect();
        restoreDesktopScroll(scrollSnapshot);
      }}
      onMouseDown={preventMouseFocus}
      type="button"
    >
      {children}
    </button>
  );
}

function CurrencySwitcher({ data, onSelect }: { data: InsightsData; onSelect: (updates: InsightsSelectionUpdate) => void }) {
  if (data.availableDisplayCurrencies.length <= 1) {
    return null;
  }

  return (
    <div aria-label="Display currency" className="flex flex-wrap items-center gap-1 text-xs">
      <span className="sr-only">View totals as:</span>
      {data.availableDisplayCurrencies.map((currency) => {
        const active = currency === data.displayCurrency;

        return (
          <InsightsQueryButton
            key={currency}
            aria-pressed={active}
            className={`rounded-full border px-2.5 py-1 font-semibold ${
              active ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-sky-700 hover:bg-sky-50"
            }`}
            href={buildInsightsHref(data, { currency })}
            onSelect={() => onSelect({ currency })}
          >
            {currency}
          </InsightsQueryButton>
        );
      })}
    </div>
  );
}

function buildInsightsHref(
  data: InsightsData,
  updates: { month?: string; currency?: string; timeframe?: InsightsData["selectedTimeframe"]; chart?: ChartMode },
) {
  const params = new URLSearchParams();
  const month = updates.month ?? data.selectedMonth;
  const currency = updates.currency ?? data.displayCurrency;
  const timeframe = updates.timeframe ?? data.selectedTimeframe;
  const chart = updates.chart ?? data.selectedChartMode;

  if (month) {
    params.set("month", month);
  }

  if (timeframe) {
    params.set("timeframe", timeframe);
  }

  if (chart) {
    params.set("chart", chart);
  }

  if (currency) {
    params.set("currency", currency);
  }

  return `/insights?${params.toString()}`;
}

function buildClientViewKey(args: {
  currency: string;
  month: string;
  timeframe: InsightsData["selectedTimeframe"];
}) {
  return `${args.month}|${args.timeframe}|${args.currency}`;
}

export function getMonthStatusClass(month: MonthPickerMonth) {
  if (!month.hasActivity) {
    return "border-slate-200 bg-slate-50 text-slate-400";
  }

  if (month.status === "net-positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (month.status === "spend-heavy") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-white text-slate-800";
}

function getMonthStatusDotClass(month: MonthPickerMonth) {
  if (!month.hasActivity) {
    return "bg-slate-300";
  }

  if (month.status === "net-positive") {
    return "bg-emerald-500";
  }

  if (month.status === "spend-heavy") {
    return "bg-amber-500";
  }

  return "bg-slate-500";
}

function MonthPickerSheet({
  data,
  onClose,
  onSelect,
}: {
  data: InsightsData;
  onClose: () => void;
  onSelect: (updates: InsightsSelectionUpdate) => void;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end bg-slate-950/30 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <button aria-label="Close month picker" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} type="button" />
      <div className="relative flex max-h-[80dvh] w-full max-w-[26rem] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Choose month</p>
            <p className="text-xs leading-5 text-slate-500">
              Tracked activity markers use {data.displayCurrency} month totals.
            </p>
          </div>
          <button
            aria-label="Close month picker"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {data.monthPickerYears.map((year) => (
            <section key={year.year} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-500">{year.year}</h3>
              <div className="grid grid-cols-3 gap-2">
                {year.months.map((month) => {
                  const isSelected = month.month === data.selectedMonth;

                  return (
                    <InsightsQueryButton
                      key={month.month}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`${month.month}${month.hasActivity ? " tracked activity" : " no tracked activity"}`}
                      className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        isSelected ? "ring-2 ring-sky-500 ring-offset-1" : ""
                      } ${getMonthStatusClass(month)}`}
                      href={buildInsightsHref(data, { month: month.month })}
                      onSelect={() => {
                        onSelect({ month: month.month });
                        onClose();
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{month.label}</span>
                        <span className={`h-2 w-2 rounded-full ${getMonthStatusDotClass(month)}`} />
                      </span>
                      <span className="mt-1 block text-[11px] font-normal opacity-75">
                        {month.hasActivity ? "Tracked" : "No activity"}
                      </span>
                    </InsightsQueryButton>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightsControlBar({ data, onSelect }: { data: InsightsData; onSelect: (updates: InsightsSelectionUpdate) => void }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const canGoNext = data.selectedMonth < data.currentMonth;

  return (
    <>
      <div className="sticky top-2 z-40 space-y-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          <InsightsQueryButton
            aria-label={`View ${data.previousMonth}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            href={buildInsightsHref(data, { month: data.previousMonth })}
            onSelect={() => onSelect({ month: data.previousMonth })}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </InsightsQueryButton>
          <button
            aria-expanded={isPickerOpen}
            aria-label={`Choose month, current ${data.monthLabel}`}
            className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={() => setIsPickerOpen(true)}
            type="button"
          >
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span className="truncate text-sm font-semibold text-slate-900">{data.monthLabel}</span>
          </button>
          {canGoNext ? (
            <InsightsQueryButton
              aria-label={`View ${data.nextMonth}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              href={buildInsightsHref(data, { month: data.nextMonth })}
              onSelect={() => onSelect({ month: data.nextMonth })}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </InsightsQueryButton>
          ) : (
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{data.selectedTimeframe}</span>
          <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{data.displayCurrency}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div aria-label="Timeframe" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {data.timeframePresets.map((timeframe) => {
              const active = timeframe === data.selectedTimeframe;

              return (
                <InsightsQueryButton
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                  href={buildInsightsHref(data, { timeframe })}
                  key={timeframe}
                  onSelect={() => onSelect({ timeframe })}
                >
                  {timeframe}
                </InsightsQueryButton>
              );
            })}
          </div>
          <CurrencySwitcher data={data} onSelect={onSelect} />
        </div>
      </div>
      {isPickerOpen ? <MonthPickerSheet data={data} onClose={() => setIsPickerOpen(false)} onSelect={onSelect} /> : null}
    </>
  );
}

function ChartModeControls({ data, onSelect }: { data: InsightsData; onSelect: (updates: InsightsSelectionUpdate) => void }) {
  const modes: Array<{ mode: ChartMode; label: string }> = [
    { mode: "mix", label: "Mix" },
    { mode: "trend", label: "Trend" },
    { mode: "bars", label: "Bars" },
  ];

  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {modes.map(({ mode, label }) => {
        const active = mode === data.selectedChartMode;

        return (
          <InsightsQueryButton
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            href={buildInsightsHref(data, { chart: mode })}
            key={mode}
            onSelect={() => onSelect({ chart: mode })}
          >
            {label}
          </InsightsQueryButton>
        );
      })}
    </div>
  );
}

function SpendingSegmentControls({
  segment,
  onSegmentChange,
  orientation = "horizontal",
}: {
  segment: SpendingMixSegment;
  onSegmentChange: (segment: SpendingMixSegment) => void;
  orientation?: "horizontal" | "vertical";
}) {
  const isVertical = orientation === "vertical";

  return (
    <div className={`inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 ${isVertical ? "flex-col" : ""}`}>
      {(["expenses", "income"] as const).map((nextSegment) => (
        <button
          key={nextSegment}
          aria-pressed={segment === nextSegment}
          className={`whitespace-nowrap rounded-md text-sm font-medium ${
            segment === nextSegment ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          } ${isVertical ? "px-3 py-1.5 text-xs" : "px-3 py-1.5"}`}
          onClick={(event) => {
            const scrollSnapshot = getDesktopScrollSnapshot();

            event.currentTarget.blur();
            onSegmentChange(nextSegment);
            restoreDesktopScroll(scrollSnapshot);
          }}
          onMouseDown={preventMouseFocus}
          type="button"
        >
          {nextSegment === "expenses" ? "Expenses" : "Income"}
        </button>
      ))}
    </div>
  );
}

function formatSpendingDayLabel(bar: { key: string; label: string }) {
  const date = new Date(`${bar.key}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return bar.label;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function buildSmoothTrendPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0]!.x} ${points[0]!.y}`;
  }

  const commands = [`M ${points[0]!.x} ${points[0]!.y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]!;
    const p1 = points[index]!;
    const p2 = points[index + 1]!;
    const p3 = points[index + 2] ?? p2;
    const cp1X = Number((p1.x + (p2.x - p0.x) / 6).toFixed(2));
    const cp1Y = Number((p1.y + (p2.y - p0.y) / 6).toFixed(2));
    const cp2X = Number((p2.x - (p3.x - p1.x) / 6).toFixed(2));
    const cp2Y = Number((p2.y - (p3.y - p1.y) / 6).toFixed(2));

    commands.push(`C ${cp1X} ${cp1Y} ${cp2X} ${cp2Y} ${p2.x} ${p2.y}`);
  }

  return commands.join(" ");
}

function buildTrendAreaPath(points: Array<{ x: number; y: number }>, baselineY: number) {
  if (!points.length) {
    return "";
  }

  const first = points[0]!;
  const last = points[points.length - 1]!;

  return `${buildSmoothTrendPath(points)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function formatTrendNetDisplay(data: InsightsData, netMinor: number) {
  if (netMinor === 0) {
    return `${getApproxPrefix(data, 0)}${formatMoney(0, data.displayCurrency)}`;
  }

  const sign = netMinor > 0 ? "+" : "-";

  return `${sign} ${getApproxPrefix(data, Math.abs(netMinor))}${formatMoney(Math.abs(netMinor), data.displayCurrency)}`;
}

export function getNearestTrendPointIndex(clientX: number, boundsLeft: number, boundsWidth: number, pointCount: number) {
  if (pointCount <= 1 || boundsWidth <= 0) {
    return 0;
  }

  const normalizedX = Math.min(1, Math.max(0, (clientX - boundsLeft) / boundsWidth));
  return Math.min(pointCount - 1, Math.max(0, Math.round(normalizedX * (pointCount - 1))));
}

function TimeframeTrendChart({ data }: { data: InsightsData }) {
  const days = data.selectedMonthTrendDays;
  const hasIncome = days.some((day) => day.cumulativeIncomeMinor > 0);
  const hasSpending = days.some((day) => day.cumulativeExpenseMinor > 0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const chartRootRef = useRef<HTMLDivElement | null>(null);
  const scrubLayerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (selectedDayIndex === null) {
      return;
    }

    function clearTrendPointOnOutsidePointerDown(event: PointerEvent) {
      if (chartRootRef.current?.contains(event.target as Node)) {
        return;
      }

      activePointerIdRef.current = null;
      setSelectedDayIndex(null);
    }

    document.addEventListener("pointerdown", clearTrendPointOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", clearTrendPointOnOutsidePointerDown);
  }, [selectedDayIndex]);

  if (!hasIncome && !hasSpending) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        No transactions tracked for this month yet.
      </p>
    );
  }

  const max = Math.max(...days.map((day) => Math.max(day.cumulativeIncomeMinor, day.cumulativeExpenseMinor)), 1);
  const yForValue = (value: number) => Number((86 - (value / max) * 68).toFixed(2));
  const xForIndex = (index: number) => Number((days.length <= 1 ? 50 : 4 + (index / (days.length - 1)) * 92).toFixed(2));
  const incomePoints = days.map((day, index) => ({ x: xForIndex(index), y: yForValue(day.cumulativeIncomeMinor) }));
  const spendingPoints = days.map((day, index) => ({ x: xForIndex(index), y: yForValue(day.cumulativeExpenseMinor) }));
  const incomePath = buildSmoothTrendPath(incomePoints);
  const spendingPath = buildSmoothTrendPath(spendingPoints);
  const baselineY = 90;
  const incomeAreaPath = buildTrendAreaPath(incomePoints, baselineY);
  const spendingAreaPath = buildTrendAreaPath(spendingPoints, baselineY);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const lastTrendDay = lastDay ?? days[0];
  const selectedDay = selectedDayIndex === null ? null : days[selectedDayIndex] ?? null;
  const selectedX = selectedDayIndex === null ? 50 : xForIndex(selectedDayIndex);
  const tooltipLeft = Math.min(74, Math.max(6, selectedX));
  const tooltipTranslate = selectedX > 74 ? "-100%" : selectedX < 26 ? "0" : "-50%";
  const note = !hasIncome ? "No income tracked this month yet." : !hasSpending ? "No spending tracked this month yet." : null;
  const netTone = selectedDay?.netMinor && selectedDay.netMinor < 0 ? "text-rose-600" : "text-emerald-700";

  const updateSelectedDayFromClientX = (clientX: number) => {
    if (!Number.isFinite(clientX)) {
      return;
    }

    const bounds = scrubLayerRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    setSelectedDayIndex(getNearestTrendPointIndex(clientX, bounds.left, bounds.width, days.length));
  };

  return (
    <div aria-label="Selected month income and spending trend" className="relative space-y-3" ref={chartRootRef} role="img">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-semibold text-emerald-700">
          Income {lastTrendDay ? `${getApproxPrefix(data, lastTrendDay.cumulativeIncomeMinor)}${lastTrendDay.cumulativeIncomeDisplay}` : ""}
        </span>
        <span className="font-semibold text-rose-700">
          Spending {lastTrendDay ? `${getApproxPrefix(data, lastTrendDay.cumulativeExpenseMinor)}${lastTrendDay.cumulativeExpenseDisplay}` : ""}
        </span>
      </div>
      {note ? <p className="text-xs leading-5 text-slate-500">{note}</p> : null}
      {selectedDay ? (
        <div
          className="pointer-events-none absolute top-7 z-10 w-48 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: `${tooltipLeft}%`, transform: `translateX(${tooltipTranslate})` }}
        >
          <p className="font-semibold text-slate-900">{formatSpendingDayLabel(selectedDay)}</p>
          <p className="text-emerald-700">Income: {getApproxPrefix(data, selectedDay.cumulativeIncomeMinor)}{selectedDay.cumulativeIncomeDisplay}</p>
          <p className="text-rose-700">Spending: {getApproxPrefix(data, selectedDay.cumulativeExpenseMinor)}{selectedDay.cumulativeExpenseDisplay}</p>
          <p className={netTone}>Net: {formatTrendNetDisplay(data, selectedDay.netMinor)}</p>
        </div>
      ) : null}
      <div className="relative">
      <svg className="h-36 w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 104">
        <defs>
          <linearGradient id="income-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
            <stop offset="78%" stopColor="#10b981" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="spending-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#e11d48" stopOpacity="0.14" />
            <stop offset="78%" stopColor="#e11d48" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path aria-hidden="true" className="stroke-slate-200" d="M 4 90 H 96" fill="none" strokeLinecap="round" strokeWidth="0.7" />
        {hasIncome ? <path aria-label="Cumulative income area" d={incomeAreaPath} fill="url(#income-trend-fill)" /> : null}
        {hasSpending ? <path aria-label="Cumulative spending area" d={spendingAreaPath} fill="url(#spending-trend-fill)" /> : null}
        {hasIncome ? (
          <>
            <path aria-hidden="true" className="stroke-emerald-200" d={incomePath} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" opacity="0.5" />
            <path aria-label="Cumulative income line" className="stroke-emerald-600" d={incomePath} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.15" />
          </>
        ) : null}
        {hasSpending ? (
          <>
            <path aria-hidden="true" className="stroke-rose-200" d={spendingPath} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" opacity="0.48" />
            <path aria-label="Cumulative spending line" className="stroke-rose-600" d={spendingPath} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.15" />
          </>
        ) : null}
        {selectedDayIndex !== null ? (
          <line
            aria-hidden="true"
            className="stroke-slate-300"
            strokeDasharray="2 2"
            strokeWidth="0.6"
            x1={selectedX}
            x2={selectedX}
            y1="12"
            y2="92"
          />
        ) : null}
        {selectedDayIndex !== null && selectedDay ? (
          <>
            {hasIncome ? (
              <circle aria-hidden="true" className="fill-white stroke-emerald-600" cx={selectedX} cy={yForValue(selectedDay.cumulativeIncomeMinor)} r="1.7" strokeWidth="0.8" />
            ) : null}
            {hasSpending ? (
              <circle aria-hidden="true" className="fill-white stroke-rose-600" cx={selectedX} cy={yForValue(selectedDay.cumulativeExpenseMinor)} r="1.7" strokeWidth="0.8" />
            ) : null}
          </>
        ) : null}
      </svg>
        <div
          aria-label="Scrub selected month trend chart"
          className="absolute inset-0 cursor-crosshair touch-pan-y"
          onPointerDown={(event) => {
            activePointerIdRef.current = event.pointerId;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            updateSelectedDayFromClientX(event.clientX);
          }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              updateSelectedDayFromClientX(event.clientX);
            }
          }}
          onPointerMove={(event) => {
            if (event.pointerType === "mouse" || activePointerIdRef.current === event.pointerId) {
              updateSelectedDayFromClientX(event.clientX);
            }
          }}
          onPointerUp={(event) => {
            if (activePointerIdRef.current === event.pointerId) {
              activePointerIdRef.current = null;
            }
          }}
          onPointerCancel={(event) => {
            if (activePointerIdRef.current === event.pointerId) {
              activePointerIdRef.current = null;
            }
          }}
          ref={scrubLayerRef}
        />
        <div className="sr-only" aria-live="polite">
          {selectedDay
            ? `${formatSpendingDayLabel(selectedDay)} trend point, income ${selectedDay.cumulativeIncomeDisplay}, spending ${selectedDay.cumulativeExpenseDisplay}, net ${selectedDay.netDisplay}`
            : ""}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="whitespace-nowrap">{firstDay ? formatSpendingDayLabel(firstDay) : data.monthLabel}</span>
        <span className="whitespace-nowrap">{lastDay ? formatSpendingDayLabel(lastDay) : data.monthLabel}</span>
      </div>
    </div>
  );
}

export function clampCategorySharePercentage(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function CategoryShareIcon({
  label,
  percentage,
  segment,
  className = "",
}: {
  label: string;
  percentage: number | null | undefined;
  segment: SpendingMixSegment;
  className?: string;
}) {
  const visuals = getCategoryVisualsByName(label);
  const CategoryIcon = visuals.icon;
  const clampedPercentage = clampCategorySharePercentage(percentage);
  const ringPercentage = clampedPercentage > 0 && clampedPercentage < 4 ? 4 : clampedPercentage;
  const context = segment === "income" ? "income" : "spending";
  const ringBackground =
    ringPercentage <= 0
      ? visuals.bg
      : `conic-gradient(${visuals.primary} 0% ${ringPercentage}%, ${visuals.bg} ${ringPercentage}% 100%)`;

  return (
    <span
      aria-label={`${label} represents ${clampedPercentage}% of ${context}`}
      className={`relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${className}`}
      role="img"
      style={{ background: ringBackground, borderColor: visuals.border, color: visuals.primary }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-full"
        style={{ backgroundColor: visuals.bg }}
      />
      <CategoryIcon aria-hidden="true" className="relative h-4 w-4" />
    </span>
  );
}

function TrendCategoryMixIcon({ item }: { item: TrendCategoryItem }) {
  const visuals = getCategoryVisualsByName(item.label);
  const CategoryIcon = visuals.icon;
  const incomeMinor = Math.max(item.incomeMinor ?? 0, 0);
  const expenseMinor = Math.max(item.expenseMinor ?? 0, 0);
  const movementMinor = incomeMinor + expenseMinor;
  const incomePercent = movementMinor > 0 ? Math.round((incomeMinor / movementMinor) * 100) : 0;
  const ringBackground =
    movementMinor <= 0
      ? visuals.bg
      : incomePercent >= 100
        ? "conic-gradient(#10B981 0% 100%)"
        : incomePercent <= 0
          ? "conic-gradient(#F43F5E 0% 100%)"
          : `conic-gradient(#10B981 0% ${incomePercent}%, #F43F5E ${incomePercent}% 100%)`;

  return (
    <span
      aria-label={`${item.label} income and spending mix`}
      className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white"
      role="img"
      style={{ background: ringBackground }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[4px] rounded-full border border-white bg-white"
      />
      <CategoryIcon aria-hidden="true" className="relative h-4 w-4" style={{ color: visuals.primary }} />
    </span>
  );
}

function getCategoryChartColor(item: { label: string }) {
  return getCategoryVisualsByName(item.label).primary;
}

type BarsCategoryItem = {
  key: string;
  label: string;
  color: string;
  amountMinor: number;
  amountDisplay: string;
  dayCount: number;
  signal?: NonNullable<InsightsData["categorySignals"]>[string];
};

type BarsDetailSheet = {
  category: BarsCategoryItem;
  kind: "limit" | "recurring";
} | null;

type BarsRecurringItem = NonNullable<NonNullable<InsightsData["categorySignals"]>[string]["recurring"]>["items"][number];

function getLimitToneClasses(status: "on-track" | "near" | "over") {
  if (status === "over") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "near") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getLimitStatusLabel(status: "on-track" | "near" | "over") {
  if (status === "over") {
    return "Over limit";
  }

  if (status === "near") {
    return "Near limit";
  }

  return "On track";
}

function getCategoryBubbleActionLabel(label: string, isSelected: boolean) {
  return `${isSelected ? "Clear" : "Select"} ${label} focus`;
}

function getRecurringFrequencyLabel(frequency: BarsRecurringItem["frequency"]) {
  if (frequency === "weekly") {
    return "Weekly";
  }

  if (frequency === "yearly") {
    return "Yearly";
  }

  if (frequency === "monthly") {
    return "Monthly";
  }

  return "Repeats";
}

function BarsCategoryBubble({
  item,
  isDimmed,
  isSelected,
  onSelect,
  setRef,
}: {
  item: BarsCategoryItem;
  isDimmed: boolean;
  isSelected: boolean;
  onSelect: () => void;
  setRef: (node: HTMLButtonElement | null) => void;
}) {
  const visuals = getCategoryVisualsByName(item.label);
  const CategoryIcon = visuals.icon;
  const limit = item.signal?.limit;
  const recurring = item.signal?.recurring?.activeCount ? item.signal.recurring : undefined;

  return (
    <button
      aria-label={getCategoryBubbleActionLabel(item.label, isSelected)}
      aria-pressed={isSelected}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        isSelected ? "border-2 shadow-sm ring-2 ring-sky-500 ring-offset-2 scale-105" : "border"
      } ${isDimmed ? "grayscale opacity-25" : "opacity-100"}`}
      onClick={onSelect}
      ref={setRef}
      style={{ backgroundColor: visuals.bg, borderColor: isSelected ? visuals.primary : visuals.border, color: visuals.primary }}
      type="button"
    >
      <CategoryIcon aria-hidden="true" className="h-5 w-5" />
      {limit ? (
        <span
          aria-hidden="true"
          className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border ${getLimitToneClasses(limit.status)}`}
        >
          <CircleGauge className="h-2.5 w-2.5" strokeWidth={2.2} />
        </span>
      ) : null}
      {recurring ? (
        <span
          aria-hidden="true"
          className={`absolute -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 ${
            limit ? "top-3.5" : "-top-1"
          }`}
        >
          <Repeat2 className="h-2.5 w-2.5" strokeWidth={2.2} />
        </span>
      ) : null}
    </button>
  );
}

function BarsCategoryFocusPanel({
  category,
  onInspect,
}: {
  category: BarsCategoryItem;
  onInspect: (kind: "limit" | "recurring") => void;
}) {
  const limit = category.signal?.limit;
  const recurring = category.signal?.recurring?.activeCount ? category.signal.recurring : undefined;
  const visuals = getCategoryVisualsByName(category.label);

  return (
    <div className="-mt-1 rounded-lg border bg-white px-3 py-2.5 shadow-sm transition" style={{ borderColor: visuals.border }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900" style={{ color: visuals.primary }}>
            {category.label}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {category.amountDisplay} · {category.dayCount} {category.dayCount === 1 ? "day" : "days"} this period
          </p>
          <p className="text-[11px] leading-4 text-slate-400">Day amounts show {category.label} only</p>
        </div>
      </div>
      {limit || recurring ? (
        <div className="mt-2 space-y-1.5">
          {limit ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <CircleGauge aria-hidden="true" className="h-4 w-4 text-sky-700" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">Limit</p>
                <p className="truncate text-xs text-slate-500">
                  {limit.spentDisplay} of {limit.amountDisplay} used ·{" "}
                  {limit.remainingMinor < 0 ? `${limit.remainingDisplay} over` : `${limit.remainingDisplay} left`}
                </p>
              </div>
              <button
                aria-label={`Inspect ${category.label} limit details`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={() => onInspect("limit")}
                type="button"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {recurring ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <Repeat2 aria-hidden="true" className="h-4 w-4 text-slate-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">Recurring</p>
                <p className="truncate text-xs text-slate-500">
                  {recurring.activeCount} active recurring {recurring.activeCount === 1 ? "item" : "items"} · monthly total ≈ {recurring.monthlyTotalDisplay}
                </p>
              </div>
              <button
                aria-label={`Inspect ${category.label} recurring details`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                onClick={() => onInspect("recurring")}
                type="button"
              >
                <Eye aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BarsReadOnlyDetailSheet({ detail, onClose }: { detail: BarsDetailSheet; onClose: () => void }) {
  if (!detail) {
    return null;
  }

  const limit = detail.category.signal?.limit;
  const recurring = detail.category.signal?.recurring?.activeCount ? detail.category.signal.recurring : undefined;

  if (detail.kind === "limit" && !limit) {
    return null;
  }

  if (detail.kind === "recurring" && !recurring) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/30 px-3 pt-4 sm:items-center sm:justify-center sm:p-4"
      role="presentation"
      style={{ paddingBottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <div
        aria-label={`${detail.category.label} ${detail.kind} details`}
        aria-modal="true"
        className="flex w-full max-w-md flex-col rounded-2xl bg-white p-4 shadow-xl"
        role="dialog"
        style={{ maxHeight: "calc(100dvh - 8.5rem - env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{detail.category.label}</p>
            <p className="text-xs text-slate-500">{detail.kind === "limit" ? "Limit details" : "Recurring details"}</p>
          </div>
          <button
            aria-label="Close details"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          {detail.kind === "limit" && limit ? (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Period</span><span className="font-medium text-slate-800">{limit.period === "weekly" ? "Weekly" : "Monthly"}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Limit amount</span><span className="font-medium text-slate-800">{limit.amountDisplay}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Used</span><span className="font-medium text-slate-800">{limit.spentDisplay}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Remaining</span><span className="font-medium text-slate-800">{limit.remainingMinor < 0 ? `${limit.remainingDisplay} over` : `${limit.remainingDisplay} left`}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Percent used</span><span className="font-medium text-slate-800">{limit.percentUsed}%</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">Status</span><span className="font-medium text-slate-800">{getLimitStatusLabel(limit.status)}</span></div>
          </div>
        ) : null}
        {detail.kind === "recurring" && recurring ? (
          <div className="space-y-2">
            {recurring.items.map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-slate-50 px-3 py-2" key={item.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{formatTransactionTitleForDisplay(item.title)}</p>
                  <p className="text-xs text-slate-500">
                    {item.tone} · {getRecurringFrequencyLabel(item.frequency)} · {item.nextDateLabel ?? "Date not set"} · {item.status}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
              </div>
            ))}
          </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildBarsIncomeCategoryBreakdown(data: InsightsData): SpendingMixCategoryItem[] {
  const totals = new Map<string, { label: string; amountMinor: number; transactionCount: number; hasUnavailableRate: boolean }>();
  const recentEntriesByKey = new Map(data.incomeCategoryBreakdown.map((item) => [item.key, item.recentEntries]));

  data.timeframeBars.flatMap((bar) => bar.incomeSegments).forEach((segment) => {
    const current = totals.get(segment.key) ?? {
      label: segment.label,
      amountMinor: 0,
      transactionCount: 0,
      hasUnavailableRate: false,
    };

    totals.set(segment.key, {
      label: current.label,
      amountMinor: current.amountMinor + Math.max(segment.amountMinor, 0),
      transactionCount: current.transactionCount + segment.transactionCount,
      hasUnavailableRate: current.hasUnavailableRate || segment.amountDisplay.includes("rate unavailable"),
    });
  });

  return Array.from(totals.entries())
    .sort((a, b) => b[1].amountMinor - a[1].amountMinor || b[1].transactionCount - a[1].transactionCount)
    .map(([key, value]) => ({
      key,
      label: value.label,
      amountMinor: value.amountMinor,
      amountDisplay: value.hasUnavailableRate
        ? `${formatMoney(value.amountMinor, data.displayCurrency)} + rate unavailable`
        : `${getApproxPrefix(data, value.amountMinor)}${formatMoney(value.amountMinor, data.displayCurrency)}`,
      transactionCount: value.transactionCount,
      recentEntries: recentEntriesByKey.get(key) ?? [],
    }));
}

function TimeframeBarsChart({
  data,
  barsSegment,
}: {
  data: InsightsData;
  barsSegment: SpendingMixSegment;
}) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [detailSheet, setDetailSheet] = useState<BarsDetailSheet>(null);
  const bubbleRefs = useRef(new Map<string, HTMLButtonElement>());
  const isIncome = barsSegment === "income";
  const max = Math.max(...data.timeframeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);
  const granularity = data.timeframeBars[0]?.granularity ?? "month";
  const categoryItems = isIncome ? data.incomeCategoryBreakdown : data.categoryBreakdown;
  const categorySignals = isIncome
    ? data.categorySignalsByType?.income ?? {}
    : data.categorySignalsByType?.expenses ?? data.categorySignals ?? {};
  const categoryColorMap = new Map(categoryItems.map((item) => [item.key, getCategoryChartColor(item)]));
  const activeBars = data.timeframeBars.filter((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor) > 0);
  const getSegmentColor = (key: string, label: string) => categoryColorMap.get(key) ?? getCategoryChartColor({ label });
  const context = isIncome ? "income" : "spending";

  useEffect(() => {
    setSelectedDayKey(null);
    setSelectedCategoryKey(null);
    setDetailSheet(null);
  }, [barsSegment, data.selectedMonth, data.selectedTimeframe, data.displayCurrency]);

  useEffect(() => {
    if (!selectedCategoryKey) {
      return;
    }

    const node = bubbleRefs.current.get(selectedCategoryKey);
    if (typeof node?.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedCategoryKey]);

  const activeCategoryItems: BarsCategoryItem[] = Array.from(
    new Map(
      activeBars
        .flatMap((bar) => (isIncome ? bar.incomeSegments : bar.segments))
        .map((segment) => [
          segment.key,
          {
            key: segment.key,
            label: segment.label,
            color: getSegmentColor(segment.key, segment.label),
            amountMinor: 0,
            amountDisplay: "",
            dayCount: 0,
            signal: categorySignals[segment.key],
          },
        ]),
    ).values(),
  ).map((item) => {
    const breakdownItem = categoryItems.find((category) => category.key === item.key);
    const dayCount = activeBars.filter((bar) => (isIncome ? bar.incomeSegments : bar.segments).some((segment) => segment.key === item.key)).length;

    return {
      ...item,
      amountMinor: breakdownItem?.amountMinor ?? 0,
      amountDisplay: breakdownItem?.amountDisplay ?? "",
      dayCount,
    };
  });
  const selectedCategory = selectedCategoryKey ? activeCategoryItems.find((item) => item.key === selectedCategoryKey) ?? null : null;
  const selectedDay = selectedDayKey ? activeBars.find((bar) => bar.key === selectedDayKey) ?? null : null;
  const selectedDayCategoryKeys = new Set((selectedDay ? (isIncome ? selectedDay.incomeSegments : selectedDay.segments) : []).map((segment) => segment.key));

  const legend = activeCategoryItems.length ? (
    <div aria-label={`${isIncome ? "Income" : "Expenses"} category bubbles`} className="flex scroll-px-3 gap-2 overflow-x-auto px-1 pb-2 pt-1">
      {activeCategoryItems.map((item) => (
        <BarsCategoryBubble
          isDimmed={Boolean(
            selectedCategoryKey
              ? selectedCategoryKey !== item.key
              : selectedDay && !selectedDayCategoryKeys.has(item.key)
          )}
          isSelected={selectedCategoryKey === item.key}
          item={item}
          key={item.key}
          onSelect={() => setSelectedCategoryKey((current) => (current === item.key ? null : item.key))}
          setRef={(node) => {
            if (node) {
              bubbleRefs.current.set(item.key, node);
            } else {
              bubbleRefs.current.delete(item.key);
            }
          }}
        />
      ))}
    </div>
  ) : null;

  if (granularity === "day") {
    const dayMax = Math.max(...activeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);

    if (!activeBars.length) {
      return (
        <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by day`} role="img">
          <p className="text-xs leading-5 text-slate-500">Showing days with tracked {isIncome ? "income" : "spending"}.</p>
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
            {isIncome ? "No income tracked for this month yet." : "No spending tracked for this month yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by day`} role="img">
        <p className="text-xs leading-5 text-slate-500">Showing days with tracked {isIncome ? "income" : "spending"}.</p>
        {legend}
        {selectedCategory ? (
          <BarsCategoryFocusPanel
            category={selectedCategory}
            onInspect={(kind) => setDetailSheet({ category: selectedCategory, kind })}
          />
        ) : null}
        <div className="space-y-2">
          {activeBars.map((bar) => {
            const amountMinor = isIncome ? bar.incomeAmountMinor : bar.amountMinor;
            const amountDisplay = isIncome ? bar.incomeAmountDisplay : bar.amountDisplay;
            const segments = isIncome ? bar.incomeSegments : bar.segments;
            const width = `${Math.max(10, Math.round((amountMinor / dayMax) * 100))}%`;
            const label = formatSpendingDayLabel(bar);
            const isSelected = selectedDayKey === bar.key;
            const containsSelectedCategory = selectedCategoryKey ? segments.some((segment) => segment.key === selectedCategoryKey) : true;
            const isBarDimmed = Boolean(selectedCategoryKey && !containsSelectedCategory);
            const selectedCategorySegment = selectedCategoryKey ? segments.find((segment) => segment.key === selectedCategoryKey) ?? null : null;
            const rowAmountDisplay = selectedCategorySegment?.amountDisplay ?? amountDisplay;

            return (
              <div className={`space-y-2 transition-opacity ${isBarDimmed ? "opacity-35" : "opacity-100"}`} key={bar.key}>
                <button
                  aria-label={`${label}, ${rowAmountDisplay} ${context}, ${isSelected ? "hide" : "tap for"} category breakdown`}
                  aria-pressed={isSelected}
                  className={`grid w-full grid-cols-[3.25rem_1fr_auto] items-center gap-2 rounded-lg px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected ? "bg-slate-50 ring-1 ring-slate-200" : ""
                  }`}
                  onClick={() => setSelectedDayKey(isSelected ? null : bar.key)}
                  type="button"
                >
                  <span className="whitespace-nowrap text-xs font-medium text-slate-600">{label}</span>
                  <span className="h-8 overflow-hidden rounded-lg bg-slate-100">
                    <span
                      aria-label={`${label} tracked ${context} ${amountDisplay}`}
                      className="flex h-full overflow-hidden rounded-lg"
                      style={{ width }}
                    >
                      {segments.map((segment, index) => (
                        <span
                          aria-label={`${label} ${segment.label} ${context} ${segment.amountDisplay}`}
                          className={`h-full transition-opacity ${
                            index > 0 ? "border-l border-white/80" : ""
                          } ${selectedCategoryKey && containsSelectedCategory && segment.key !== selectedCategoryKey ? "opacity-35" : "opacity-100"}`}
                          key={segment.key}
                          role="img"
                          style={{
                            backgroundColor: getSegmentColor(segment.key, segment.label),
                            flexBasis: `${Math.max(0, (segment.amountMinor / amountMinor) * 100)}%`,
                            minWidth: segments.length > 1 ? "3px" : undefined,
                          }}
                        />
                      ))}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-slate-800">{rowAmountDisplay}</span>
                </button>
                {isSelected ? (
                  <BarsDayBreakdownPanel
                    bar={bar}
                    isIncome={isIncome}
                    segments={segments}
                    selectedCategoryKey={selectedCategoryKey}
                    totalDisplay={amountDisplay}
                    totalMinor={amountMinor}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        <BarsReadOnlyDetailSheet detail={detailSheet} onClose={() => setDetailSheet(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-slate-500">Showing monthly tracked {isIncome ? "income" : "spending"}.</p>
      {legend}
      {selectedCategory ? (
        <BarsCategoryFocusPanel
          category={selectedCategory}
          onInspect={(kind) => setDetailSheet({ category: selectedCategory, kind })}
        />
      ) : null}
      <div
        className="grid min-h-44 grid-cols-[repeat(auto-fit,minmax(2.25rem,1fr))] items-end gap-2"
        aria-label={`Tracked ${isIncome ? "income" : "spending"} by month`}
        role="img"
      >
        {data.timeframeBars.map((bar) => {
          const amountMinor = isIncome ? bar.incomeAmountMinor : bar.amountMinor;
          const amountDisplay = isIncome ? bar.incomeAmountDisplay : bar.amountDisplay;
          const segments = isIncome ? bar.incomeSegments : bar.segments;
          const height = amountMinor > 0 ? Math.max(8, Math.round((amountMinor / max) * 128)) : 2;
          const containsSelectedCategory = selectedCategoryKey ? segments.some((segment) => segment.key === selectedCategoryKey) : true;
          const isBarDimmed = Boolean(selectedCategoryKey && !containsSelectedCategory);

          return (
            <div className={`flex min-w-0 flex-col items-center gap-2 transition-opacity ${isBarDimmed ? "opacity-35" : "opacity-100"}`} key={bar.key}>
              <div className="flex h-32 w-full items-end rounded-md bg-slate-50 px-1">
                <div
                  aria-label={`${bar.label} tracked ${isIncome ? "income" : "spending"} ${amountDisplay}`}
                  className="flex w-full overflow-hidden rounded-md"
                  style={{ height }}
                >
                  {segments.length ? (
                    segments.map((segment) => (
                      <span
                        aria-label={`${bar.label} ${segment.label} ${isIncome ? "income" : "spending"} ${segment.amountDisplay}`}
                        className={`h-full transition-opacity ${
                          selectedCategoryKey && containsSelectedCategory && segment.key !== selectedCategoryKey ? "opacity-35" : "opacity-100"
                        }`}
                        key={segment.key}
                        role="img"
                        style={{
                          backgroundColor: getSegmentColor(segment.key, segment.label),
                          flexBasis: `${Math.max(0, (segment.amountMinor / amountMinor) * 100)}%`,
                        }}
                      />
                    ))
                  ) : (
                    <span className="h-full w-full bg-slate-300" />
                  )}
                </div>
              </div>
              <span className="h-4 max-w-full truncate text-[10px] font-medium text-slate-500">{bar.label}</span>
            </div>
          );
        })}
      </div>
      <BarsReadOnlyDetailSheet detail={detailSheet} onClose={() => setDetailSheet(null)} />
    </div>
  );
}

function BarsDayBreakdownPanel({
  bar,
  isIncome,
  segments,
  selectedCategoryKey,
  totalDisplay,
  totalMinor,
}: {
  bar: InsightsData["timeframeBars"][number];
  isIncome: boolean;
  segments: InsightsData["timeframeBars"][number]["segments"];
  selectedCategoryKey?: string | null;
  totalDisplay: string;
  totalMinor: number;
}) {
  const label = formatSpendingDayLabel(bar);
  const context = isIncome ? "income" : "spending";
  const orderedSegments =
    selectedCategoryKey && segments.some((segment) => segment.key === selectedCategoryKey)
      ? [
          ...segments.filter((segment) => segment.key === selectedCategoryKey),
          ...segments.filter((segment) => segment.key !== selectedCategoryKey),
        ]
      : segments;

  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm" aria-label={`${label} ${context} category breakdown`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="whitespace-nowrap text-xs font-semibold text-slate-800">{label}</p>
        <p className="min-w-0 truncate text-right text-xs font-medium text-slate-500">Total {totalDisplay}</p>
      </div>
      <div className="space-y-1.5">
        {orderedSegments.map((segment) => {
          const visuals = getCategoryVisualsByName(segment.label);
          const SegmentIcon = visuals.icon;
          const percentage = totalMinor > 0 ? Math.round((Math.max(segment.amountMinor, 0) / totalMinor) * 100) : 0;

          return (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_2.5rem] items-center gap-2 text-xs" key={segment.key}>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                style={{ backgroundColor: visuals.bg, borderColor: visuals.border, color: visuals.primary }}
              >
                <SegmentIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 truncate font-medium text-slate-700">{segment.label}</span>
              <span className="whitespace-nowrap font-semibold text-slate-800">{segment.amountDisplay}</span>
              <span className="text-right font-medium text-slate-500">{percentage}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeframeMixChart({ data, segment }: { data: InsightsData; segment: SpendingMixSegment }) {
  const spendingMixItems = segment === "income" ? data.incomeCategoryBreakdown : data.categoryBreakdown;
  const chart = buildSpendingMixChartItems(spendingMixItems);
  const defaultSelectedKey =
    chart.items.reduce<SpendingMixChartItem | null>((largest, item) => {
      if (Math.max(item.amountMinor, 0) <= 0) {
        return largest;
      }

      if (!largest || item.amountMinor > largest.amountMinor) {
        return item;
      }

      return largest;
    }, null)?.key ??
    chart.items[0]?.key ??
    null;
  const [selectedKey, setSelectedKey] = useState<string | null>(defaultSelectedKey);
  const [mixBreakdownExpanded, setMixBreakdownExpanded] = useState(false);
  const selectedKeyIsVisible = selectedKey ? chart.items.some((item) => item.key === selectedKey && Math.max(item.amountMinor, 0) > 0) : false;
  const effectiveSelectedKey = selectedKeyIsVisible ? selectedKey : defaultSelectedKey;
  const focusedItems = effectiveSelectedKey ? spendingMixItems.filter((item) => item.key === effectiveSelectedKey) : [];
  const visibleItems = mixBreakdownExpanded ? spendingMixItems : focusedItems;
  const showBreakdownToggle = spendingMixItems.length > 1;

  useEffect(() => {
    setSelectedKey(defaultSelectedKey);
    setMixBreakdownExpanded(false);
  }, [defaultSelectedKey, segment]);

  return (
    <div className="space-y-4">
      <SpendingMixSummaryChart chart={chart} onSelect={setSelectedKey} selectedKey={effectiveSelectedKey} segment={segment} />
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">{mixBreakdownExpanded ? "Category breakdown" : "Selected category"}</p>
        <SpendingMixRows
          displayCurrency={data.displayCurrency}
          items={spendingMixItems}
          onSelect={setSelectedKey}
          selectedKey={effectiveSelectedKey}
          segment={segment}
          visibleItems={visibleItems}
        />
        {showBreakdownToggle ? (
          <button
            className="text-sm font-medium text-sky-700 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={() => setMixBreakdownExpanded((current) => !current)}
            type="button"
          >
            {mixBreakdownExpanded ? "Show selected only" : "Show all categories"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TimeframeCategoryBreakdown({
  items,
  segment = "expenses",
  showIcons = false,
  emptyMessage = "No tracked spending in this timeframe yet.",
  expandable = false,
}: {
  items: SpendingMixCategoryItem[];
  segment?: SpendingMixSegment;
  showIcons?: boolean;
  emptyMessage?: string;
  expandable?: boolean;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);
  const isIncome = segment === "income";

  if (!items.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0;
        const chartColor = getCategoryChartColor(item);
        const isExpanded = expandedKey === item.key;
        const countLabel = `${percent}% of ${isIncome ? "income" : "spending"} - ${item.transactionCount} ${
          item.transactionCount === 1 ? "transaction" : "transactions"
        }`;

        if (expandable) {
          return (
            <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={item.key}>
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Hide" : "Show"} ${item.label} entries`}
                className={`grid w-full gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                  showIcons ? "grid-cols-[2rem_1fr]" : "grid-cols-1"
                }`}
                onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                type="button"
              >
                {showIcons ? <CategoryShareIcon label={item.label} percentage={percent} segment={segment} /> : null}
                <span className="min-w-0 space-y-2">
                  <span className="grid grid-cols-[1fr_auto] gap-3">
                    <span className="min-w-0">
                      <span className="truncate text-sm font-medium text-slate-900">{item.label}</span>
                      <span className="block text-xs text-slate-500">{countLabel}</span>
                    </span>
                    <span className="whitespace-nowrap text-sm font-semibold text-slate-800">{item.amountDisplay}</span>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                    <span
                      aria-label={`${item.label} ${isIncome ? "income" : "spending"} share ${percent}%`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={percent}
                      className="block h-full rounded-full"
                      role="meter"
                      style={{ backgroundColor: chartColor, width: `${percent}%` }}
                    />
                  </span>
                </span>
              </button>
              {showIcons && !isIncome && item.label.toLowerCase() === "needs category" ? (
                <Link
                  className="ml-11 mt-2 inline-flex rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  href="/transactions?view=needs-review"
                >
                  Review
                </Link>
              ) : null}
              {isExpanded ? (
                <div className={showIcons ? "ml-11 mt-2 rounded-lg bg-slate-50 px-3 py-2" : "mt-2 rounded-lg bg-slate-50 px-3 py-2"}>
                  <div className="space-y-2">
                    {item.recentEntries.map((entry) => (
                      <div className="grid grid-cols-[1fr_auto] gap-3" key={entry.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{formatTransactionTitleForDisplay(entry.title)}</p>
                          <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-semibold text-slate-700">{entry.amountDisplay}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={item.key}>
            <div className={`grid min-w-0 ${showIcons ? "grid-cols-[2rem_1fr] gap-3" : "grid-cols-1"}`}>
              {showIcons ? (
                <CategoryShareIcon label={item.label} percentage={percent} segment={segment} />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                  {showIcons && !isIncome && item.label.toLowerCase() === "needs category" ? (
                    <Link
                      className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                      href="/transactions?view=needs-review"
                    >
                      Review
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">{countLabel}</p>
              </div>
            </div>
            <p className="whitespace-nowrap text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
          </div>
        );
      })}
    </div>
  );
}

function formatTransactionCountLabel(count: number) {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

function formatTrendNetAmountDisplay(item: TrendCategoryItem) {
  const netMinor = item.netMinor ?? item.amountMinor;
  const display = item.netDisplay ?? item.amountDisplay;

  if (netMinor > 0 && !display.startsWith("+")) {
    return `+${display}`;
  }

  return display;
}

function sortTrendDetailEntries(entries: TrendCategoryItem["recentEntries"]) {
  return [...entries].sort((left, right) => {
    const occurredComparison = new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
    if (occurredComparison !== 0) {
      return occurredComparison;
    }

    const createdComparison = new Date(right.createdAt ?? "").getTime() - new Date(left.createdAt ?? "").getTime();
    if (Number.isFinite(createdComparison) && createdComparison !== 0) {
      return createdComparison;
    }

    return right.id.localeCompare(left.id);
  });
}

function TrendCategoryEntryList({
  entries,
  tone,
}: {
  entries: TrendCategoryItem["recentEntries"];
  tone: "income" | "expense";
}) {
  const amountClass = tone === "income" ? "text-emerald-700" : "text-rose-700";

  if (!entries.length) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Details could not load.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const amountDisplay = entry.displayAmountDisplay ?? entry.amountDisplay;
        const signedAmount =
          tone === "income" || amountDisplay.startsWith("-") || amountDisplay.startsWith("+") || amountDisplay.startsWith("≈ ")
            ? amountDisplay
            : `-${amountDisplay}`;

        return (
          <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-white px-3 py-2" key={entry.id}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-medium text-slate-800">{formatTransactionTitleForDisplay(entry.title || "Unnamed transaction")}</p>
                {entry.isRecurring ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                    <Repeat2 aria-hidden="true" className="h-3 w-3" />
                    Recurring
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
            </div>
            <p className={`whitespace-nowrap text-sm font-semibold ${amountClass}`}>{signedAmount}</p>
          </div>
        );
      })}
    </div>
  );
}

function TrendCategoryExplorer({
  displayCurrency,
  items,
}: {
  displayCurrency: string;
  items: TrendCategoryItem[];
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  if (!items.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No tracked money movement in this period.</p>;
  }

  const sortedItems = [...items].sort((left, right) => {
    const movementDelta = (right.movementMinor ?? Math.abs(right.amountMinor)) - (left.movementMinor ?? Math.abs(left.amountMinor));
    return movementDelta || left.label.localeCompare(right.label);
  });
  const visibleLimit = 10;
  const selectedItem = selectedKey ? sortedItems.find((item) => item.key === selectedKey) ?? null : null;
  const topItems = sortedItems.slice(0, visibleLimit);
  const gridItems =
    showAllCategories || sortedItems.length <= visibleLimit
      ? sortedItems
      : selectedItem && !topItems.some((item) => item.key === selectedItem.key)
        ? [...topItems, selectedItem]
        : topItems;
  const shouldShowToggle = sortedItems.length > visibleLimit;
  const selectedIncomeMinor = Math.max(selectedItem?.incomeMinor ?? 0, 0);
  const selectedExpenseMinor = Math.max(selectedItem?.expenseMinor ?? 0, 0);
  const selectedIsMixed = selectedIncomeMinor > 0 && selectedExpenseMinor > 0;
  const selectedIsIncomeOnly = selectedIncomeMinor > 0 && selectedExpenseMinor === 0;
  const selectedIncomeEntries = selectedItem
    ? sortTrendDetailEntries(selectedItem.recentEntries.filter((entry) => entry.transactionType === "income"))
    : [];
  const selectedExpenseEntries = selectedItem
    ? sortTrendDetailEntries(selectedItem.recentEntries.filter((entry) => entry.transactionType !== "income"))
    : [];
  const selectedAmountDisplay = selectedItem ? (selectedIsMixed ? formatTrendNetAmountDisplay(selectedItem) : selectedItem.amountDisplay) : "";
  const selectedAmountClass = selectedIsMixed
    ? (selectedItem?.netMinor ?? 0) > 0
      ? "text-emerald-700"
      : (selectedItem?.netMinor ?? 0) < 0
        ? "text-rose-700"
        : "text-slate-800"
    : selectedIsIncomeOnly
      ? "text-emerald-700"
      : "text-rose-700";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {gridItems.map((item) => {
          const isSelected = selectedKey === item.key;

          return (
            <button
              aria-label={`${isSelected ? "Hide" : "Show"} ${item.label} details`}
              aria-pressed={isSelected}
              className={`rounded-full p-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected ? "bg-slate-100 ring-2 ring-slate-300" : "hover:bg-slate-50"
              }`}
              key={item.key}
              onClick={() => setSelectedKey(isSelected ? null : item.key)}
              title={item.label}
              type="button"
            >
              <TrendCategoryMixIcon item={item} />
            </button>
          );
        })}
      </div>
      {shouldShowToggle ? (
        <button
          className="text-sm font-medium text-sky-700 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onClick={() => setShowAllCategories((current) => !current)}
          type="button"
        >
          {showAllCategories ? "Show fewer" : "Show all"}
        </button>
      ) : null}
      {selectedItem ? (
        <div className="rounded-lg bg-slate-50 px-3 py-3">
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{selectedItem.label}</p>
              <p className="text-xs text-slate-500">{formatTransactionCountLabel(selectedItem.transactionCount)}</p>
            </div>
            <p className={`whitespace-nowrap text-sm font-semibold ${selectedAmountClass}`}>{selectedAmountDisplay}</p>
          </div>
          <div className="mb-3 grid gap-2 text-xs text-slate-600">
            {selectedIncomeMinor > 0 ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>Income</span>
                <span className="font-medium text-emerald-700">{selectedItem.incomeDisplay ?? formatMoney(selectedIncomeMinor, displayCurrency)}</span>
              </div>
            ) : null}
            {selectedExpenseMinor > 0 ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>Spending</span>
                <span className="font-medium text-rose-700">{selectedItem.expenseDisplay ?? formatMoney(selectedExpenseMinor, displayCurrency)}</span>
              </div>
            ) : null}
          </div>
          {selectedIsMixed ? (
            <div className="space-y-3">
              {selectedIncomeEntries.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Income</p>
                  <TrendCategoryEntryList entries={selectedIncomeEntries} tone="income" />
                </div>
              ) : null}
              {selectedExpenseEntries.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Spending</p>
                  <TrendCategoryEntryList entries={selectedExpenseEntries} tone="expense" />
                </div>
              ) : null}
              {!selectedIncomeEntries.length && !selectedExpenseEntries.length ? <p className="text-xs text-slate-500">Details could not load.</p> : null}
            </div>
          ) : (
            <TrendCategoryEntryList
              entries={selectedIsIncomeOnly ? selectedIncomeEntries : selectedExpenseEntries}
              tone={selectedIsIncomeOnly ? "income" : "expense"}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function getMonthlySnapshotConversionDetails(data: InsightsData) {
  const converted = data.selectedPeriodConvertedCurrencyBreakdowns.filter((breakdown) => breakdown.currency !== data.displayCurrency);
  const income = converted.filter((breakdown) => breakdown.incomeMinor > 0 && breakdown.incomeDisplayMinor !== null);
  const spending = converted.filter((breakdown) => breakdown.expenseMinor > 0 && breakdown.expenseDisplayMinor !== null);
  const hasMissingRates = converted.some(
    (breakdown) => breakdown.incomeDisplayMinor === null || breakdown.expenseDisplayMinor === null || breakdown.netDisplayMinor === null,
  );

  return {
    income,
    spending,
    hasConvertedEntries: income.length > 0 || spending.length > 0,
    missingRateNote: hasMissingRates ? "Some currencies need a rate before they can be included." : null,
  };
}

function getSnapshotHero(data: InsightsData) {
  if (data.selectedTimeframe === "All") {
    return {
      label: "Tracked balance",
      amountMinor: data.trackedBalanceDisplayMinor,
    };
  }

  return {
    label: data.selectedTimeframe === "1M" ? "Monthly net" : "Period net",
    amountMinor: data.selectedPeriodIncomeDisplayMinor - data.selectedPeriodExpenseDisplayMinor,
  };
}

function MonthlySnapshotCard({ data }: { data: InsightsData }) {
  const [isConversionDetailsOpen, setIsConversionDetailsOpen] = useState(false);
  const conversionDetails = getMonthlySnapshotConversionDetails(data);
  const hero = getSnapshotHero(data);

  return (
    <Card className="rounded-lg" data-testid="monthly-snapshot-card">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Monthly snapshot</CardTitle>
            <CardDescription>{data.monthLabel}</CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{data.displayCurrency}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">{hero.label}</p>
          <p className="whitespace-nowrap text-2xl font-semibold text-slate-900">
            {getApproxPrefix(data, hero.amountMinor)}
            {formatMoney(hero.amountMinor, data.displayCurrency)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-medium text-emerald-700">Income</p>
            <p className="whitespace-nowrap text-sm font-semibold text-emerald-800">
              {getApproxPrefix(data, data.selectedPeriodIncomeDisplayMinor)}
              {formatMoney(data.selectedPeriodIncomeDisplayMinor, data.displayCurrency)}
            </p>
          </div>
          <div className="rounded-lg bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-medium text-rose-700">Spending</p>
            <p className="whitespace-nowrap text-sm font-semibold text-rose-800">
              {getApproxPrefix(data, data.selectedPeriodExpenseDisplayMinor)}
              {formatMoney(data.selectedPeriodExpenseDisplayMinor, data.displayCurrency)}
            </p>
          </div>
        </div>
        <div className="text-xs leading-5 text-slate-500">
          <p>
            {data.selectedPeriodTransactionCount} tracked {data.selectedPeriodTransactionCount === 1 ? "transaction" : "transactions"}
          </p>
          {conversionDetails.hasConvertedEntries ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70">
              <button
                aria-expanded={isConversionDetailsOpen}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-slate-600"
                onClick={() => setIsConversionDetailsOpen((current) => !current)}
                type="button"
              >
                <span>Contains converted currency</span>
                <Info aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
              </button>
              {isConversionDetailsOpen ? (
                <div className="border-t border-slate-200 px-3 pb-3 pt-2 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-800">Converted currency included</p>
                  {conversionDetails.income.length ? (
                    <div className="mt-2">
                      <p className="font-medium text-slate-700">Income</p>
                      <div className="mt-1 grid gap-1">
                        {conversionDetails.income.map((breakdown) => (
                          <p key={`income-${breakdown.currency}`}>{formatOriginalCurrencyAmount(breakdown.incomeMinor, breakdown.currency)}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {conversionDetails.spending.length ? (
                    <div className="mt-2">
                      <p className="font-medium text-slate-700">Spending</p>
                      <div className="mt-1 grid gap-1">
                        {conversionDetails.spending.map((breakdown) => (
                          <p key={`spending-${breakdown.currency}`}>{formatOriginalCurrencyAmount(breakdown.expenseMinor, breakdown.currency)}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 text-slate-500">Shown in {data.displayCurrency} for this view. Original entries stay unchanged.</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {conversionDetails.missingRateNote ? <p className="mt-2">{conversionDetails.missingRateNote}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TimeframeInsightsCard({ data, onSelect }: { data: InsightsData; onSelect: (updates: InsightsSelectionUpdate) => void }) {
  const [mixSegment, setMixSegment] = useState<SpendingMixSegment>("expenses");
  const [barsSegment, setBarsSegment] = useState<SpendingMixSegment>("expenses");
  const activeSegment = data.selectedChartMode === "bars" ? barsSegment : mixSegment;
  const isBarsIncome = data.selectedChartMode === "bars" && barsSegment === "income";
  const breakdownItems = isBarsIncome ? buildBarsIncomeCategoryBreakdown(data) : data.timeframeCategoryBreakdown;
  const trendBreakdownItems = data.trendCategoryBreakdown ?? [];
  const breakdownSegment = isBarsIncome ? "income" : "expenses";
  const breakdownEmptyMessage = isBarsIncome ? "No income tracked for this month yet." : "No tracked spending in this timeframe yet.";
  const isTrend = data.selectedChartMode === "trend";
  const periodContextLabel = data.selectedTimeframe === "1M" ? data.monthLabel : data.timeframeLabel;
  const primaryValueLine =
    activeSegment === "income"
      ? `Income ${getApproxPrefix(data, data.selectedPeriodIncomeDisplayMinor)}${formatMoney(
          data.selectedPeriodIncomeDisplayMinor,
          data.displayCurrency,
        )}`
      : `Spending ${getApproxPrefix(data, data.selectedPeriodExpenseDisplayMinor)}${formatMoney(
          data.selectedPeriodExpenseDisplayMinor,
          data.displayCurrency,
        )}`;
  const contextLine = isTrend
    ? `${periodContextLabel} · Income and spending trend`
    : `${periodContextLabel} · ${data.displayCurrency} tracked ${activeSegment}`;

  return (
    <Card className="rounded-lg" data-testid="timeframe-insights-card">
      <CardHeader className="p-4 pb-1">
        <div className="flex items-start justify-between gap-3" data-testid="tracked-view-header-row">
          <div className="space-y-1">
            <CardTitle className="text-lg">Tracked view</CardTitle>
            <ChartModeControls data={data} onSelect={onSelect} />
          </div>
          {isTrend ? null : (
            <SpendingSegmentControls
              orientation="vertical"
              segment={activeSegment}
              onSegmentChange={data.selectedChartMode === "bars" ? setBarsSegment : setMixSegment}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-0.5">
          {isTrend ? null : <p className="text-base font-semibold text-slate-900 sm:text-lg">{primaryValueLine}</p>}
          <p className="text-sm leading-5 text-slate-500">{contextLine}</p>
        </div>
        {data.selectedChartMode === "trend" ? <TimeframeTrendChart data={data} /> : null}
        {data.selectedChartMode === "bars" ? <TimeframeBarsChart barsSegment={barsSegment} data={data} /> : null}
        {data.selectedChartMode === "mix" ? <TimeframeMixChart data={data} segment={mixSegment} /> : null}
        {data.selectedChartMode === "mix" ? null : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">{isTrend ? "Categories on this trend" : "Category breakdown"}</p>
            {isTrend ? (
              <TrendCategoryExplorer
                displayCurrency={data.displayCurrency}
                items={trendBreakdownItems}
              />
            ) : (
              <TimeframeCategoryBreakdown
                emptyMessage={breakdownEmptyMessage}
                expandable={data.selectedChartMode === "bars"}
                items={breakdownItems}
                segment={breakdownSegment}
                showIcons
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildSpendingMixChartItems(items: SpendingMixCategoryItem[]) {
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

  return {
    total,
    items: items.map((item) => ({
      ...item,
      color: getCategoryChartColor(item),
      percent: total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0,
    })),
  };
}

type SpendingMixChartItem = ReturnType<typeof buildSpendingMixChartItems>["items"][number];

export type SpendingMixDonutSegment = SpendingMixChartItem & {
  startAngle: number;
  endAngle: number;
  arcPath: string;
};

const donutCenter = { x: 60, y: 60 };
const donutRadius = 42;
const donutArrowRadius = 30;
const donutGapDegrees = 2.4;
const donutMinimumSliceDegrees = 7;

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3));
}

function getDonutPoint(angleDegrees: number, radius = donutRadius) {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: formatSvgNumber(donutCenter.x + radius * Math.cos(angleRadians)),
    y: formatSvgNumber(donutCenter.y + radius * Math.sin(angleRadians)),
  };
}

function getDonutArcPath(startAngle: number, endAngle: number) {
  const start = getDonutPoint(startAngle);
  const end = getDonutPoint(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${donutRadius} ${donutRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

function getDonutMidAngle(startAngle: number, endAngle: number) {
  return (startAngle + endAngle) / 2;
}

function normalizeDegrees(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function getAngleDistance(a: number, b: number) {
  const delta = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
  return Math.min(delta, 360 - delta);
}

function getNearestDonutSegmentKey(segments: SpendingMixDonutSegment[], x: number, y: number) {
  if (!segments.length) {
    return null;
  }

  const pointerAngle = (Math.atan2(y - donutCenter.y, x - donutCenter.x) * 180) / Math.PI;

  return segments.reduce<{ key: string; distance: number } | null>((nearest, segment) => {
    const distance = getAngleDistance(pointerAngle, getDonutMidAngle(segment.startAngle, segment.endAngle));

    if (!nearest || distance < nearest.distance) {
      return { key: segment.key, distance };
    }

    return nearest;
  }, null)?.key ?? null;
}

function normalizeDonutAngles(items: SpendingMixChartItem[], total: number) {
  const positiveItems = items.filter((item) => Math.max(item.amountMinor, 0) > 0);
  const gap = positiveItems.length > 1 ? donutGapDegrees : 0;
  const availableDegrees = 360 - positiveItems.length * gap;
  const minimumDegrees =
    positiveItems.length > 1 ? Math.min(donutMinimumSliceDegrees, availableDegrees / positiveItems.length) : availableDegrees;
  const rawAngles = positiveItems.map((item) => (Math.max(item.amountMinor, 0) / total) * availableDegrees);
  const deficit = rawAngles.reduce((sum, angle) => sum + Math.max(minimumDegrees - angle, 0), 0);
  const adjustable = rawAngles.reduce((sum, angle) => sum + Math.max(angle - minimumDegrees, 0), 0);

  return rawAngles.map((angle) => {
    if (angle < minimumDegrees) {
      return minimumDegrees;
    }

    if (deficit <= 0 || adjustable <= 0) {
      return angle;
    }

    return angle - deficit * ((angle - minimumDegrees) / adjustable);
  });
}

export function buildSpendingMixDonutSegments(items: SpendingMixChartItem[], total: number): SpendingMixDonutSegment[] {
  if (!items.length || total <= 0) {
    return [];
  }

  const positiveItems = items.filter((item) => Math.max(item.amountMinor, 0) > 0);
  const gap = positiveItems.length > 1 ? donutGapDegrees : 0;
  const angles = normalizeDonutAngles(positiveItems, total);
  let cursor = -90 + gap / 2;

  return positiveItems.map((item, index) => {
    const startAngle = cursor;
    const endAngle = cursor + angles[index]!;
    cursor = endAngle + gap;

    return {
      ...item,
      startAngle,
      endAngle,
      arcPath: getDonutArcPath(startAngle, endAngle),
    };
  });
}

function SpendingMixSummaryChart({
  chart,
  onSelect,
  selectedKey,
  segment,
}: {
  chart: ReturnType<typeof buildSpendingMixChartItems>;
  onSelect: (key: string) => void;
  selectedKey: string | null;
  segment: SpendingMixSegment;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrubPointerIdRef = useRef<number | null>(null);
  const donutSegments = buildSpendingMixDonutSegments(chart.items, chart.total);
  const selectedItem = chart.items.find((item) => item.key === selectedKey) ?? donutSegments[0] ?? chart.items[0] ?? null;
  const selectedSegment = donutSegments.find((item) => item.key === selectedItem?.key) ?? null;
  const selectedSegmentIndex = selectedSegment ? donutSegments.findIndex((item) => item.key === selectedSegment.key) : -1;
  const selectedAngle = selectedSegment ? getDonutMidAngle(selectedSegment.startAngle, selectedSegment.endAngle) : null;
  const selectedArrowPoint = selectedAngle === null ? null : getDonutPoint(selectedAngle, donutArrowRadius);
  const SelectedIcon = selectedItem ? getCategoryVisualsByName(selectedItem.label).icon : null;
  const context = segment === "income" ? "income" : "spending";

  function selectNearestSegmentFromPointer(clientX: number, clientY: number) {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const svgX = ((clientX - rect.left) / rect.width) * 120;
    const svgY = ((clientY - rect.top) / rect.height) * 120;
    const nearestKey = getNearestDonutSegmentKey(donutSegments, svgX, svgY);

    if (nearestKey) {
      onSelect(nearestKey);
    }
  }

  function selectSegmentByOffset(offset: number) {
    if (selectedSegmentIndex < 0 || !donutSegments.length) {
      return;
    }

    const nextIndex = (selectedSegmentIndex + offset + donutSegments.length) % donutSegments.length;
    onSelect(donutSegments[nextIndex]!.key);
  }

  if (!chart.items.length || chart.total <= 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div
        aria-label={`${segment === "income" ? "Income" : "Expenses"} category share chart`}
        className="relative mx-auto aspect-square w-full max-w-[180px] cursor-grab touch-none active:cursor-grabbing"
        onPointerCancel={(event) => {
          if (scrubPointerIdRef.current === event.pointerId) {
            scrubPointerIdRef.current = null;
          }
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          scrubPointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          selectNearestSegmentFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (scrubPointerIdRef.current !== event.pointerId) {
            return;
          }

          event.preventDefault();
          selectNearestSegmentFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (scrubPointerIdRef.current === event.pointerId) {
            scrubPointerIdRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        role="img"
      >
        <svg ref={svgRef} className="relative h-full w-full" shapeRendering="geometricPrecision" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={`spending-mix-highlight-${segment}`} x1="25%" x2="75%" y1="10%" y2="90%">
              <stop offset="0%" stopColor="white" stopOpacity="0.72" />
              <stop offset="48%" stopColor="white" stopOpacity="0.12" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <circle cx={donutCenter.x} cy={donutCenter.y} fill="none" r={donutRadius} stroke="#e2e8f0" strokeWidth="16" />
          {donutSegments.length === 1 ? (
            <circle
              aria-label={`${donutSegments[0]!.label}, ${donutSegments[0]!.amountDisplay}, ${donutSegments[0]!.percent} percent of ${context}`}
              className="cursor-pointer focus:outline-none"
              cx={donutCenter.x}
              cy={donutCenter.y}
              fill="none"
              onClick={() => onSelect(donutSegments[0]!.key)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(donutSegments[0]!.key);
                }
              }}
              r={donutRadius}
              role="button"
              stroke={donutSegments[0]!.color}
              strokeLinejoin="round"
              strokeWidth={donutSegments[0]!.key === selectedItem?.key ? "17" : "16"}
              tabIndex={0}
            />
          ) : (
            donutSegments.map((item) => (
              <path
                key={item.key}
                aria-label={`${item.label}, ${item.amountDisplay}, ${item.percent} percent of ${context}`}
                className="cursor-pointer focus:outline-none"
                d={item.arcPath}
                fill="none"
                onClick={() => onSelect(item.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(item.key);
                  }
                }}
                opacity={item.key === selectedItem?.key ? 1 : 0.72}
                role="button"
                stroke={item.color}
                strokeLinecap="butt"
                strokeLinejoin="round"
                strokeWidth={item.key === selectedItem?.key ? "17" : "15"}
                tabIndex={0}
              />
            ))
          )}
          <circle cx={donutCenter.x} cy={donutCenter.y} fill="none" r="33" stroke={`url(#spending-mix-highlight-${segment})`} strokeWidth="2" />
          <circle cx={donutCenter.x} cy={donutCenter.y} fill="#f8fafc" r="27" />
          {selectedArrowPoint && selectedItem && selectedAngle !== null ? (
            <path
              aria-valuemax={donutSegments.length}
              aria-valuemin={1}
              aria-valuenow={selectedSegmentIndex + 1}
              aria-valuetext={`${selectedItem.label}, ${selectedItem.amountDisplay}, ${selectedItem.percent} percent of ${context}`}
              aria-label={`Selected ${context} category`}
              className="pointer-events-none focus:outline-none"
              d={`M ${selectedArrowPoint.x} ${formatSvgNumber(selectedArrowPoint.y - 5)} L ${formatSvgNumber(selectedArrowPoint.x + 4.5)} ${formatSvgNumber(
                selectedArrowPoint.y + 3,
              )} L ${formatSvgNumber(selectedArrowPoint.x - 4.5)} ${formatSvgNumber(selectedArrowPoint.y + 3)} Z`}
              fill={selectedItem.color}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  selectSegmentByOffset(1);
                }

                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  selectSegmentByOffset(-1);
                }

                if (event.key === "Home") {
                  event.preventDefault();
                  onSelect(donutSegments[0]!.key);
                }

                if (event.key === "End") {
                  event.preventDefault();
                  onSelect(donutSegments[donutSegments.length - 1]!.key);
                }
              }}
              role="slider"
              stroke="#ffffff"
              strokeLinejoin="round"
              strokeWidth="1.4"
              tabIndex={0}
              transform={`rotate(${formatSvgNumber(selectedAngle + 90)} ${selectedArrowPoint.x} ${selectedArrowPoint.y})`}
            />
          ) : null}
        </svg>
        {selectedItem ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex w-[5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
            {SelectedIcon ? <SelectedIcon aria-hidden="true" className="mb-0.5 h-3.5 w-3.5 shrink-0" style={{ color: selectedItem.color }} /> : null}
            <p className="w-full truncate text-[10px] font-semibold leading-3 text-slate-900">{selectedItem.label}</p>
            <p className="mt-0.5 w-full truncate text-[9px] font-semibold leading-3 text-slate-700">{selectedItem.amountDisplay}</p>
            <p className="text-[9px] font-medium leading-3 text-slate-500">{selectedItem.percent}%</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type SpendingMixRecentEntry = SpendingMixCategoryItem["recentEntries"][number];

type GroupedMixEntry = {
  key: string;
  title: string;
  amountDisplay: string;
  metaLabel: string;
  count: number;
  totalMinor: number;
  latestOccurredAt: string;
};

function normalizeMixEntryTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function formatGroupedMixTitle(title: string) {
  return formatTransactionTitleForDisplay(title.trim().replace(/\s+/g, " "));
}

function formatGroupedMixAmount(group: {
  approximate: boolean;
  hasUnavailableRate: boolean;
  totalMinor: number;
}, displayCurrency: string) {
  if (group.hasUnavailableRate) {
    return `${formatMoney(group.totalMinor, displayCurrency)} + rate unavailable`;
  }

  return `${group.approximate ? "≈ " : ""}${formatMoney(group.totalMinor, displayCurrency)}`;
}

function buildGroupedMixEntries(entries: SpendingMixRecentEntry[], displayCurrency: string): GroupedMixEntry[] {
  const groups = new Map<
    string,
    {
      key: string;
      title: string;
      count: number;
      totalMinor: number;
      latestOccurredAt: string;
      latestOccurredLabel: string;
      approximate: boolean;
      hasUnavailableRate: boolean;
      firstEntry: SpendingMixRecentEntry;
    }
  >();

  for (const entry of entries) {
    const normalizedTitle = normalizeMixEntryTitle(entry.title);
    const key = normalizedTitle || entry.id;
    const current = groups.get(key);
    const displayAmountMinor = entry.displayAmountMinor ?? entry.amountMinor;
    const nextLatest =
      !current || new Date(entry.occurredAt).getTime() > new Date(current.latestOccurredAt).getTime()
        ? { occurredAt: entry.occurredAt, occurredLabel: entry.occurredLabel }
        : { occurredAt: current.latestOccurredAt, occurredLabel: current.latestOccurredLabel };

    groups.set(key, {
      key,
      title: current?.title ?? formatGroupedMixTitle(entry.title),
      count: (current?.count ?? 0) + 1,
      totalMinor: (current?.totalMinor ?? 0) + displayAmountMinor,
      latestOccurredAt: nextLatest.occurredAt,
      latestOccurredLabel: nextLatest.occurredLabel,
      approximate: Boolean(current?.approximate || entry.displayAmountApproximate),
      hasUnavailableRate: Boolean(current?.hasUnavailableRate || entry.displayAmountUnavailable),
      firstEntry: current?.firstEntry ?? entry,
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      title: group.title,
      amountDisplay:
        group.count === 1
          ? group.firstEntry.amountDisplay
          : formatGroupedMixAmount(group, displayCurrency),
      metaLabel: group.count === 1 ? group.latestOccurredLabel : `${group.count} entries`,
      count: group.count,
      totalMinor: group.totalMinor,
      latestOccurredAt: group.latestOccurredAt,
    }))
    .sort((a, b) => {
      if (b.totalMinor !== a.totalMinor) {
        return b.totalMinor - a.totalMinor;
      }

      const dateDelta = new Date(b.latestOccurredAt).getTime() - new Date(a.latestOccurredAt).getTime();

      if (dateDelta !== 0) {
        return dateDelta;
      }

      return a.title.localeCompare(b.title);
    });
}

function SpendingMixRows({
  displayCurrency,
  items,
  onSelect,
  selectedKey,
  segment,
  visibleItems,
}: {
  displayCurrency: string;
  items: InsightsData["categoryBreakdown"];
  onSelect: (key: string) => void;
  selectedKey: string | null;
  segment: SpendingMixSegment;
  visibleItems?: InsightsData["categoryBreakdown"];
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);
  const renderedItems = visibleItems ?? items;

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        {segment === "income"
          ? "No income entries for this month yet. When income is tracked, it will show up here."
          : "No monthly spending categories yet."}
      </p>
    );
  }

  return (
    <>
      {renderedItems.map((item) => {
        const percent = total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0;
        const isExpanded = expandedKey === item.key;
        const isSelected = selectedKey === item.key;
        const chartColor = getCategoryChartColor(item);
        const groupedEntries = isExpanded ? buildGroupedMixEntries(item.recentEntries, displayCurrency) : [];

        return (
          <div key={item.key} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <button
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Hide" : "Show"} ${item.label} entries`}
              aria-pressed={isSelected}
              className={`grid w-full grid-cols-[2rem_1fr] gap-3 rounded-lg px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected ? "bg-slate-50 ring-1 ring-slate-200" : ""
              }`}
              onClick={() => {
                onSelect(item.key);
                setExpandedKey(isExpanded ? null : item.key);
              }}
              type="button"
            >
              <CategoryShareIcon label={item.label} percentage={percent} segment={segment} />
              <span className="min-w-0 space-y-2">
                <span className="grid grid-cols-[1fr_auto] gap-3">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{item.label}</span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-sm font-semibold text-slate-800">{item.amountDisplay}</span>
                </span>
                <span className="grid grid-cols-[1fr_auto] gap-3">
                  <span className="text-xs text-slate-500">
                    {item.transactionCount} {item.transactionCount === 1 ? "entry" : "entries"}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{percent}%</span>
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    aria-label={`${item.label} ${segment === "income" ? "income" : "spending"} share ${percent}%`}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={percent}
                    className="block h-full rounded-full"
                    role="meter"
                    style={{ backgroundColor: chartColor, width: `${percent}%` }}
                  />
                </span>
              </span>
            </button>
            {item.label.toLowerCase() === "needs category" ? (
              <Link
                className="ml-11 mt-2 inline-flex rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                href="/transactions?view=needs-review"
              >
                Review
              </Link>
            ) : null}
            <div className="ml-11 min-w-0 space-y-2">
              {isExpanded ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="space-y-2">
                    {groupedEntries.map((entry) => (
                      <div key={entry.key} className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{entry.title}</p>
                          <p className="text-xs text-slate-500">{entry.metaLabel}</p>
                        </div>
                        <p className="whitespace-nowrap text-sm font-semibold text-slate-700">{entry.amountDisplay}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

function getLimitStatusColor(percentUsed: number) {
  if (percentUsed >= 120) {
    return "bg-red-600";
  }

  if (percentUsed >= 100) {
    return "bg-orange-600";
  }

  if (percentUsed >= 80) {
    return "bg-amber-500";
  }

  if (percentUsed >= 50) {
    return "bg-lime-500";
  }

  return "bg-emerald-500";
}

export function InsightsOverview({ data, loadError = false }: InsightsOverviewProps) {
  const [activeData, setActiveData] = useState<InsightsData>(data);
  const hasTrackedData = activeData.trackedTransactionCount > 0;
  const hasCurrentMonthData = activeData.currentMonthTransactionCount > 0;
  const selectInsightsView = (updates: InsightsSelectionUpdate) => {
    setActiveData((currentData) => {
      const nextChart = updates.chart ?? currentData.selectedChartMode;
      const nextCurrency = updates.currency ?? currentData.displayCurrency;
      const nextMonth = updates.month ?? currentData.selectedMonth;
      const nextTimeframe = updates.timeframe ?? currentData.selectedTimeframe;
      const cachedView =
        data.clientViews?.[
          buildClientViewKey({
            currency: nextCurrency,
            month: nextMonth,
            timeframe: nextTimeframe,
          })
        ] ?? currentData;

      return {
        ...cachedView,
        clientViews: data.clientViews,
        selectedChartMode: nextChart,
      };
    });
  };

  return (
    <section className="space-y-5">
      <ScreenHeader
        eyebrow="Insights"
        title="Monthly clarity"
        description="Tracked money only. Not a bank statement."
      />
      <InsightsControlBar data={activeData} onSelect={selectInsightsView} />
      {loadError ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Latest data could not load</CardTitle>
            <CardDescription>Try again from the bottom navigation. No financial details were changed.</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!hasTrackedData ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Nothing tracked yet</CardTitle>
            <CardDescription>
              Add a transaction or review an imported receipt, and this page will start showing month-level signals.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <MonthlySnapshotCard data={activeData} />
      <TimeframeInsightsCard data={activeData} onSelect={selectInsightsView} />

      {activeData.hasMissingRates ? (
        <p className="text-xs leading-5 text-slate-500">
          Some currencies need a rate before they can be included in converted totals.
        </p>
      ) : null}

      {hasTrackedData && !hasCurrentMonthData ? (
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <p>
            You have tracked history, but no transactions in {activeData.monthLabel} yet.
          </p>
          {activeData.isSelectedMonthCurrent && activeData.hasHistoricalActivity && activeData.latestActivityMonth ? (
            <InsightsQueryButton
              className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              href={buildInsightsHref(activeData, { month: activeData.latestActivityMonth })}
              onSelect={() => selectInsightsView({ month: activeData.latestActivityMonth ?? undefined })}
            >
              View latest month with activity
            </InsightsQueryButton>
          ) : null}
        </div>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            {activeData.selectedTimeframe === "1M" ? "Largest expenses this month" : "Largest expenses in period"}
          </CardTitle>
          <CardDescription>Top tracked expenses from {activeData.selectedTimeframe === "1M" ? activeData.monthLabel : activeData.timeframeLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeData.largestRecentExpenses.length ? (
            activeData.largestRecentExpenses.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{formatTransactionTitleForDisplay(item.title)}</p>
                  <p className="text-xs text-slate-500">
                    {item.categoryLabel} - {item.occurredLabel}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              No tracked expenses in {activeData.selectedTimeframe === "1M" ? activeData.monthLabel : "this period"} yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Category limits</CardTitle>
          <CardDescription>See how your planned limits are going.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeData.budgetProgress.length ? (
            activeData.budgetProgress.map((item) => (
              <div key={item.budgetId} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.categoryLabel}</p>
                    <p className="text-xs text-slate-500">
                      {item.period === "weekly" ? "Weekly" : "Monthly"} · {item.spentDisplay} of {item.amountDisplay} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.isOverBudget ? "text-rose-700" : "text-slate-800"}`}>
                      {item.isOverBudget ? `${item.remainingDisplay} over` : `${item.remainingDisplay} left`}
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${getLimitStatusColor(item.percentUsed)}`}
                    style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{item.percentUsed}% used</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">Set a category limit from Assistant to track progress here.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
