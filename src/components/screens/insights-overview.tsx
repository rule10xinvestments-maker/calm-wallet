"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Car,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  HeartPulse,
  House,
  Plane,
  ReceiptText,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  Utensils,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initialBudgetActionState, type BudgetActionState } from "@/lib/actions/budgets-state";
import type { InsightsData } from "@/lib/server/transactions-read-model";

type SpendingMixSegment = "expenses" | "income";

type SpendingMixCategoryItem = InsightsData["categoryBreakdown"][number];
type MonthPickerMonth = InsightsData["monthPickerYears"][number]["months"][number];
type ChartMode = InsightsData["selectedChartMode"];

const spendingMixChartColors = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#64748b",
];

const incomeCategoryChartColors = [
  "#059669",
  "#14b8a6",
  "#22c55e",
  "#0d9488",
  "#65a30d",
  "#06b6d4",
  "#84cc16",
  "#64748b",
];

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

function getApproxPrefix(data: InsightsData, amountMinor: number) {
  return data.hasConvertedCurrencies && amountMinor !== 0 ? "≈ " : "";
}

function CurrencySwitcher({ data }: { data: InsightsData }) {
  if (data.availableDisplayCurrencies.length <= 1) {
    return null;
  }

  return (
    <div aria-label="Display currency" className="flex flex-wrap items-center gap-1 text-xs">
      <span className="sr-only">View totals as:</span>
      {data.availableDisplayCurrencies.map((currency) => {
        const active = currency === data.displayCurrency;

        return (
          <Link
            key={currency}
            aria-current={active ? "true" : undefined}
            className={`rounded-full border px-2.5 py-1 font-semibold ${
              active ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-sky-700 hover:bg-sky-50"
            }`}
            href={buildInsightsHref(data, { currency })}
          >
            {currency}
          </Link>
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
}: {
  data: InsightsData;
  onClose: () => void;
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
              Tracked activity markers use {data.displayCurrency}
              {data.hasConvertedCurrencies ? " approximate" : ""} month totals.
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
                    <Link
                      key={month.month}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`${month.month}${month.hasActivity ? " tracked activity" : " no tracked activity"}${month.isApproximate ? " approximate" : ""}`}
                      className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        isSelected ? "ring-2 ring-sky-500 ring-offset-1" : ""
                      } ${getMonthStatusClass(month)}`}
                      href={buildInsightsHref(data, { month: month.month })}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{month.label}</span>
                        <span className={`h-2 w-2 rounded-full ${getMonthStatusDotClass(month)}`} />
                      </span>
                      <span className="mt-1 block text-[11px] font-normal opacity-75">
                        {month.hasActivity ? `Tracked${month.isApproximate ? ", approx" : ""}` : "No activity"}
                      </span>
                    </Link>
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

function InsightsControlBar({ data }: { data: InsightsData }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const canGoNext = data.selectedMonth < data.currentMonth;

  return (
    <>
      <div className="sticky top-2 z-40 space-y-2 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
        <div className="flex items-center gap-1">
          <Link
            aria-label={`View ${data.previousMonth}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            href={buildInsightsHref(data, { month: data.previousMonth })}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
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
            <Link
              aria-label={`View ${data.nextMonth}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              href={buildInsightsHref(data, { month: data.nextMonth })}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Link>
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
                <Link
                  aria-current={active ? "true" : undefined}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                  href={buildInsightsHref(data, { timeframe })}
                  key={timeframe}
                >
                  {timeframe}
                </Link>
              );
            })}
          </div>
          <CurrencySwitcher data={data} />
        </div>
      </div>
      {isPickerOpen ? <MonthPickerSheet data={data} onClose={() => setIsPickerOpen(false)} /> : null}
    </>
  );
}

function ChartModeControls({ data }: { data: InsightsData }) {
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
          <Link
            aria-current={active ? "true" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
            data-scroll-preserve="true"
            href={buildInsightsHref(data, { chart: mode })}
            key={mode}
            scroll={false}
          >
            {label}
          </Link>
        );
      })}
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

function TimeframeTrendChart({ data }: { data: InsightsData }) {
  const days = data.selectedMonthTrendDays;
  const hasIncome = days.some((day) => day.cumulativeIncomeMinor > 0);
  const hasSpending = days.some((day) => day.cumulativeExpenseMinor > 0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

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
  const finalNetMinor = lastTrendDay?.netMinor ?? 0;
  const finalNetTone = finalNetMinor < 0 ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-700";

  return (
    <div aria-label="Selected month income and spending trend" className="relative space-y-3" role="img">
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
        <div
          aria-label={`Month net ${formatTrendNetDisplay(data, finalNetMinor)}`}
          className={`absolute right-0 top-1 z-10 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm ${finalNetTone}`}
        >
          {formatTrendNetDisplay(data, finalNetMinor)}
        </div>
      <svg className="h-36 w-full touch-pan-y overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 104">
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
        {days.map((day, index) => {
          const x = xForIndex(index);
          const hitWidth = Math.max(3, 100 / days.length);

          return (
            <g key={day.key}>
              <rect
                aria-label={`${formatSpendingDayLabel(day)} trend point, income ${day.cumulativeIncomeDisplay}, spending ${day.cumulativeExpenseDisplay}, net ${day.netDisplay}`}
                className="cursor-crosshair fill-transparent"
                height="104"
                onPointerDown={() => setSelectedDayIndex(index)}
                onPointerEnter={() => setSelectedDayIndex(index)}
                onPointerMove={() => setSelectedDayIndex(index)}
                width={hitWidth}
                x={x - hitWidth / 2}
                y="0"
              />
            </g>
          );
        })}
      </svg>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="whitespace-nowrap">{firstDay ? formatSpendingDayLabel(firstDay) : data.monthLabel}</span>
        <span className="whitespace-nowrap">{lastDay ? formatSpendingDayLabel(lastDay) : data.monthLabel}</span>
      </div>
    </div>
  );
}

function CategoryColorIcon({ label, color, className = "" }: { label: string; color: string; className?: string }) {
  const CategoryIcon = getSpendingCategoryIcon(label);

  return (
    <div
      aria-label={`${label} chart color and category icon`}
      className={`flex h-8 w-8 items-center justify-center rounded-full border ${className}`}
      role="img"
      style={{ backgroundColor: `${color}1A`, borderColor: `${color}33`, color }}
    >
      <CategoryIcon aria-hidden="true" className="h-4 w-4" />
    </div>
  );
}

function TimeframeBarsChart({ data }: { data: InsightsData }) {
  const [barsSegment, setBarsSegment] = useState<SpendingMixSegment>("expenses");
  const isIncome = barsSegment === "income";
  const max = Math.max(...data.timeframeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);
  const granularity = data.timeframeBars[0]?.granularity ?? "month";
  const categoryItems = isIncome ? data.incomeCategoryBreakdown : data.categoryBreakdown;
  const palette = isIncome ? incomeCategoryChartColors : spendingMixChartColors;
  const categoryColorMap = new Map(categoryItems.map((item, index) => [item.key, palette[index % palette.length]!]));
  const activeBars = data.timeframeBars.filter((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor) > 0);
  const getSegmentColor = (key: string, index: number) => categoryColorMap.get(key) ?? palette[index % palette.length]!;
  const activeLegendItems = Array.from(
    new Map(
      activeBars
        .flatMap((bar) => (isIncome ? bar.incomeSegments : bar.segments))
        .map((segment, index) => [
          segment.key,
          {
            key: segment.key,
            label: segment.label,
            color: getSegmentColor(segment.key, index),
          },
        ]),
    ).values(),
  );

  const toggle = (
    <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
      {(["expenses", "income"] as const).map((segment) => (
        <button
          key={segment}
          aria-pressed={barsSegment === segment}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            barsSegment === segment ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
          onClick={() => setBarsSegment(segment)}
          type="button"
        >
          {segment === "expenses" ? "Expenses" : "Income"}
        </button>
      ))}
    </div>
  );

  const legend = activeLegendItems.length ? (
    <div aria-label={`${isIncome ? "Income" : "Expenses"} category icon legend`} className="flex gap-2 overflow-x-auto pb-1">
      {activeLegendItems.slice(0, 6).map((item) => (
        <CategoryColorIcon className="shrink-0" color={item.color} key={item.key} label={item.label} />
      ))}
    </div>
  ) : null;

  if (granularity === "day") {
    const dayMax = Math.max(...activeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);

    if (!activeBars.length) {
      return (
        <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by day`} role="img">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">Showing days with tracked {isIncome ? "income" : "spending"}.</p>
            {toggle}
          </div>
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
            {isIncome ? "No income tracked for this month yet." : "No spending tracked for this month yet."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by day`} role="img">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">Showing days with tracked {isIncome ? "income" : "spending"}.</p>
          {toggle}
        </div>
        {legend}
        <div className="space-y-2">
          {activeBars.map((bar) => {
            const amountMinor = isIncome ? bar.incomeAmountMinor : bar.amountMinor;
            const amountDisplay = isIncome ? bar.incomeAmountDisplay : bar.amountDisplay;
            const segments = isIncome ? bar.incomeSegments : bar.segments;
            const width = `${Math.max(10, Math.round((amountMinor / dayMax) * 100))}%`;
            const label = formatSpendingDayLabel(bar);

            return (
              <div className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-2" key={bar.key}>
                <span className="whitespace-nowrap text-xs font-medium text-slate-600">{label}</span>
                <div className="h-8 overflow-hidden rounded-lg bg-slate-50">
                  <div
                    aria-label={`${label} tracked ${isIncome ? "income" : "spending"} ${amountDisplay}`}
                    className="flex h-full overflow-hidden rounded-lg"
                    style={{ width }}
                  >
                    {segments.map((segment, index) => (
                      <span
                        aria-label={`${label} ${segment.label} ${isIncome ? "income" : "spending"} ${segment.amountDisplay}`}
                        className="h-full"
                        key={segment.key}
                        role="img"
                        style={{
                          backgroundColor: getSegmentColor(segment.key, index),
                          flexBasis: `${Math.max(0, (segment.amountMinor / amountMinor) * 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs font-semibold text-slate-800">{amountDisplay}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">Showing monthly tracked {isIncome ? "income" : "spending"}.</p>
        {toggle}
      </div>
      {legend}
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

          return (
            <div className="flex min-w-0 flex-col items-center gap-2" key={bar.key}>
              <div className="flex h-32 w-full items-end rounded-md bg-slate-50 px-1">
                <div
                  aria-label={`${bar.label} tracked ${isIncome ? "income" : "spending"} ${amountDisplay}`}
                  className="flex w-full overflow-hidden rounded-md"
                  style={{ height }}
                >
                  {segments.length ? (
                    segments.map((segment, index) => (
                      <span
                        aria-label={`${bar.label} ${segment.label} ${isIncome ? "income" : "spending"} ${segment.amountDisplay}`}
                        className="h-full"
                        key={segment.key}
                        role="img"
                        style={{
                          backgroundColor: getSegmentColor(segment.key, index),
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
    </div>
  );
}

function TimeframeMixChart({ data }: { data: InsightsData }) {
  const [spendingMixSegment, setSpendingMixSegment] = useState<SpendingMixSegment>("expenses");
  const spendingMixItems = spendingMixSegment === "income" ? data.incomeCategoryBreakdown : data.categoryBreakdown;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {data.monthLabel} - {data.displayCurrency} tracked {spendingMixSegment}
          {data.hasConvertedCurrencies ? " - approximate display totals" : null}
        </p>
        <div className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["expenses", "income"] as const).map((segment) => (
            <button
              key={segment}
              aria-pressed={spendingMixSegment === segment}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                spendingMixSegment === segment ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setSpendingMixSegment(segment)}
              type="button"
            >
              {segment === "expenses" ? "Expenses" : "Income"}
            </button>
          ))}
        </div>
      </div>
      <SpendingMixSummaryChart items={spendingMixItems} segment={spendingMixSegment} />
      <div className="space-y-3">
        <SpendingMixRows items={spendingMixItems} segment={spendingMixSegment} />
      </div>
    </div>
  );
}

function TimeframeCategoryBreakdown({ data, showIcons = false }: { data: InsightsData; showIcons?: boolean }) {
  const total = data.timeframeCategoryBreakdown.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

  if (!data.timeframeCategoryBreakdown.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">No tracked spending in this timeframe yet.</p>;
  }

  return (
    <div className="space-y-3">
      {data.timeframeCategoryBreakdown.map((item, index) => {
        const percent = total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0;
        const chartColor = spendingMixChartColors[index % spendingMixChartColors.length]!;

        return (
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={item.key}>
            <div className={`grid min-w-0 ${showIcons ? "grid-cols-[2rem_1fr] gap-3" : "grid-cols-1"}`}>
              {showIcons ? (
                <CategoryColorIcon className="mt-0.5" color={chartColor} label={item.label} />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{item.label}</p>
                  {showIcons && item.label.toLowerCase() === "needs category" ? (
                    <Link
                      className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                      href="/transactions?view=needs-review"
                    >
                      Review
                    </Link>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">
                  {percent}% of spending - {item.transactionCount} {item.transactionCount === 1 ? "transaction" : "transactions"}
                </p>
              </div>
            </div>
            <p className="whitespace-nowrap text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
          </div>
        );
      })}
    </div>
  );
}

function getMonthlySnapshotConversionNote(data: InsightsData) {
  const converted = data.convertedCurrencyBreakdowns.filter((breakdown) => breakdown.currency !== data.displayCurrency);
  const parts: string[] = [];

  converted.forEach((breakdown) => {
    if (breakdown.incomeMinor > 0 && breakdown.incomeDisplayMinor !== null) {
      parts.push(`${formatMoney(breakdown.incomeMinor, breakdown.currency)} converted income`);
    }

    if (breakdown.expenseMinor > 0 && breakdown.expenseDisplayMinor !== null) {
      parts.push(`${formatMoney(breakdown.expenseMinor, breakdown.currency)} converted spending`);
    }
  });

  if (parts.length) {
    return `Includes ${parts.join(" / ")}`;
  }

  if (converted.some((breakdown) => breakdown.incomeDisplayMinor === null || breakdown.expenseDisplayMinor === null || breakdown.netDisplayMinor === null)) {
    return "Some currencies need a rate before they can be included.";
  }

  return null;
}

function MonthlySnapshotCard({ data }: { data: InsightsData }) {
  const conversionNote = getMonthlySnapshotConversionNote(data);

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
          <p className="text-xs font-medium text-slate-500">Tracked balance</p>
          <p className="whitespace-nowrap text-2xl font-semibold text-slate-900">
            {getApproxPrefix(data, data.trackedBalanceDisplayMinor)}
            {formatMoney(data.trackedBalanceDisplayMinor, data.displayCurrency)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-medium text-emerald-700">Income</p>
            <p className="whitespace-nowrap text-sm font-semibold text-emerald-800">
              {getApproxPrefix(data, data.monthlyIncomeDisplayMinor)}
              {formatMoney(data.monthlyIncomeDisplayMinor, data.displayCurrency)}
            </p>
          </div>
          <div className="rounded-lg bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-medium text-rose-700">Spending</p>
            <p className="whitespace-nowrap text-sm font-semibold text-rose-800">
              {getApproxPrefix(data, data.monthlyExpenseDisplayMinor)}
              {formatMoney(data.monthlyExpenseDisplayMinor, data.displayCurrency)}
            </p>
          </div>
        </div>
        <div className="text-xs leading-5 text-slate-500">
          <p>
            {data.trackedTransactionCount} tracked {data.trackedTransactionCount === 1 ? "transaction" : "transactions"}
          </p>
          {conversionNote ? <p>{conversionNote}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TimeframeInsightsCard({ data }: { data: InsightsData }) {
  return (
    <Card className="rounded-lg" data-testid="timeframe-insights-card">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Tracked spending view</CardTitle>
            <CardDescription>
              {data.timeframeExpenseDisplay} across {data.timeframeTransactionCount} tracked {data.timeframeTransactionCount === 1 ? "transaction" : "transactions"}
              {data.hasConvertedCurrencies ? " - approximate" : null}
            </CardDescription>
          </div>
          <ChartModeControls data={data} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.selectedChartMode === "trend" ? <TimeframeTrendChart data={data} /> : null}
        {data.selectedChartMode === "bars" ? <TimeframeBarsChart data={data} /> : null}
        {data.selectedChartMode === "mix" ? <TimeframeMixChart data={data} /> : null}
        {data.selectedChartMode === "mix" ? null : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Category breakdown</p>
            <TimeframeCategoryBreakdown data={data} showIcons={data.selectedChartMode === "bars"} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSpendingCategoryIcon(label: string): LucideIcon {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("income") || normalizedLabel.includes("salary") || normalizedLabel.includes("pay")) {
    return Wallet;
  }

  if (normalizedLabel.includes("dining") || normalizedLabel.includes("food")) {
    return Utensils;
  }

  if (normalizedLabel.includes("grocer")) {
    return ShoppingBasket;
  }

  if (normalizedLabel.includes("housing") || normalizedLabel.includes("home") || normalizedLabel.includes("rent")) {
    return House;
  }

  if (normalizedLabel.includes("transfer")) {
    return ArrowLeftRight;
  }

  if (normalizedLabel.includes("travel") || normalizedLabel.includes("flight") || normalizedLabel.includes("plane")) {
    return Plane;
  }

  if (normalizedLabel.includes("transport") || normalizedLabel.includes("taxi") || normalizedLabel.includes("car")) {
    return Car;
  }

  if (normalizedLabel.includes("bill") || normalizedLabel.includes("utilit") || normalizedLabel.includes("receipt")) {
    return ReceiptText;
  }

  if (normalizedLabel.includes("shopping")) {
    return ShoppingBag;
  }

  if (normalizedLabel.includes("personal")) {
    return User;
  }

  if (normalizedLabel.includes("health") || normalizedLabel.includes("medical")) {
    return HeartPulse;
  }

  if (normalizedLabel.includes("entertain") || normalizedLabel.includes("ticket")) {
    return Ticket;
  }

  if (normalizedLabel.includes("uncategorized") || normalizedLabel.includes("needs")) {
    return CircleHelp;
  }

  return Tag;
}

function buildSpendingMixChartItems(items: SpendingMixCategoryItem[]) {
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

  return {
    total,
    items: items.map((item, index) => ({
      ...item,
      color: spendingMixChartColors[index % spendingMixChartColors.length]!,
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

const donutCenter = { x: 60, y: 58 };
const donutRadius = 42;
const donutGapDegrees = 2.4;
const donutMinimumSliceDegrees = 7;

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3));
}

function getDonutPoint(angleDegrees: number) {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: formatSvgNumber(donutCenter.x + donutRadius * Math.cos(angleRadians)),
    y: formatSvgNumber(donutCenter.y + donutRadius * Math.sin(angleRadians)),
  };
}

function getDonutArcPath(startAngle: number, endAngle: number) {
  const start = getDonutPoint(startAngle);
  const end = getDonutPoint(endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${donutRadius} ${donutRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
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
  items,
  segment,
}: {
  items: SpendingMixCategoryItem[];
  segment: SpendingMixSegment;
}) {
  const chart = buildSpendingMixChartItems(items);
  const donutSegments = buildSpendingMixDonutSegments(chart.items, chart.total);

  if (!chart.items.length || chart.total <= 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="relative mx-auto aspect-square w-full max-w-[180px]" aria-label={`${segment === "income" ? "Income" : "Expenses"} category share chart`} role="img">
        <div className="absolute inset-x-[19%] bottom-[10%] h-7 rounded-full bg-slate-300/40 blur-md" />
        <svg className="relative h-full w-full drop-shadow-sm" shapeRendering="geometricPrecision" viewBox="0 0 120 120">
          <defs>
            <linearGradient id={`spending-mix-highlight-${segment}`} x1="25%" x2="75%" y1="10%" y2="90%">
              <stop offset="0%" stopColor="white" stopOpacity="0.72" />
              <stop offset="48%" stopColor="white" stopOpacity="0.12" />
              <stop offset="100%" stopColor="black" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="67" fill="#cbd5e1" opacity="0.5" rx="43" ry="38" />
          <circle cx="60" cy="58" fill="none" r={donutRadius} stroke="#e2e8f0" strokeWidth="16" />
          {donutSegments.length === 1 ? (
            <circle
              aria-label={`${donutSegments[0]!.label} ${segment === "income" ? "income" : "spending"} chart slice ${donutSegments[0]!.percent}%`}
              cx="60"
              cy="58"
              fill="none"
              r={donutRadius}
              stroke={donutSegments[0]!.color}
              strokeLinejoin="round"
              strokeWidth="16"
            />
          ) : (
            donutSegments.map((item) => (
              <path
                key={item.key}
                aria-label={`${item.label} ${segment === "income" ? "income" : "spending"} chart slice ${item.percent}%`}
                d={item.arcPath}
                fill="none"
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="16"
              />
            ))
          )}
          <circle cx="60" cy="58" fill="none" r="33" stroke={`url(#spending-mix-highlight-${segment})`} strokeWidth="2" />
          <circle cx="60" cy="58" fill="#f8fafc" r="27" />
          <text className="fill-slate-900 text-[13px] font-semibold" textAnchor="middle" x="60" y="56">
            {chart.items.length}
          </text>
          <text className="fill-slate-500 text-[7px] font-medium" textAnchor="middle" x="60" y="67">
            categories
          </text>
        </svg>
      </div>
    </div>
  );
}

function SpendingMixRows({
  items,
  segment,
}: {
  items: InsightsData["categoryBreakdown"];
  segment: SpendingMixSegment;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);

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
      {items.map((item, index) => {
        const percent = total > 0 ? Math.round((Math.max(item.amountMinor, 0) / total) * 100) : 0;
        const CategoryIcon = getSpendingCategoryIcon(item.label);
        const isExpanded = expandedKey === item.key;
        const chartColor = spendingMixChartColors[index % spendingMixChartColors.length]!;

        return (
          <div key={item.key} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <div
              aria-label={`${item.label} chart color and category icon`}
              className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border"
              role="img"
              style={{ backgroundColor: `${chartColor}1A`, borderColor: `${chartColor}33`, color: chartColor }}
            >
              <CategoryIcon aria-hidden="true" className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-2">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      aria-expanded={isExpanded}
                      className="rounded-md text-left font-medium text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                      type="button"
                    >
                      <span className="font-medium text-slate-900">{item.label}</span>
                    </button>
                    {item.label.toLowerCase() === "needs category" ? (
                      <Link
                        className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                        href="/transactions?view=needs-review"
                      >
                        Review
                      </Link>
                    ) : null}
                  </div>
                </div>
                <button
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${item.label} entries`}
                  className="whitespace-nowrap rounded-md text-right text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                  type="button"
                >
                  {item.amountDisplay}
                </button>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <p className="text-xs text-slate-500">
                  {item.transactionCount} {item.transactionCount === 1 ? "entry" : "entries"}
                </p>
                <p className="text-xs font-medium text-slate-500">{percent}%</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  aria-label={`${item.label} ${segment === "income" ? "income" : "spending"} share ${percent}%`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={percent}
                  className="h-full rounded-full"
                  role="meter"
                  style={{ backgroundColor: chartColor, width: `${percent}%` }}
                />
              </div>
              {isExpanded ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="space-y-2">
                    {item.recentEntries.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-[1fr_auto] gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{entry.title}</p>
                          <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
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

function BudgetActionMessage({ state }: { state: BudgetActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return <p className={`text-xs ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>{state.message}</p>;
}

function BudgetSetup({ data, action }: { data: InsightsData; action: InsightsOverviewProps["upsertBudgetAction"] }) {
  const [state, formAction, pending] = useActionState(action, initialBudgetActionState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
      <input name="monthStart" type="hidden" value={data.monthStart} />
      <input name="currency" type="hidden" value={data.currency} />
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Category</span>
        <select
          className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900"
          name="categoryId"
          required
        >
          {data.budgetCategoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium text-slate-600">Amount</span>
        <input
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900"
          min="0.01"
          name="amount"
          placeholder="250"
          step="0.01"
          type="number"
          required
        />
      </label>
      <div className="flex items-end">
        <button
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60"
          disabled={pending || data.budgetCategoryOptions.length === 0}
          type="submit"
        >
          Save
        </button>
      </div>
      <div className="sm:col-span-3">
        <BudgetActionMessage state={state} />
      </div>
    </form>
  );
}

function BudgetRemoveButton({
  budgetId,
  action,
}: {
  budgetId: string;
  action: InsightsOverviewProps["deleteBudgetAction"];
}) {
  const [state, formAction, pending] = useActionState(action, initialBudgetActionState);

  return (
    <form action={formAction} className="space-y-1">
      <input name="budgetId" type="hidden" value={budgetId} />
      <button className="text-xs font-medium text-slate-500 underline-offset-4 hover:underline" disabled={pending} type="submit">
        Remove
      </button>
      <BudgetActionMessage state={state} />
    </form>
  );
}

export function InsightsOverview({ data, upsertBudgetAction, deleteBudgetAction, loadError = false }: InsightsOverviewProps) {
  const hasTrackedData = data.trackedTransactionCount > 0;
  const hasCurrentMonthData = data.currentMonthTransactionCount > 0;

  return (
    <section className="space-y-5">
      <ScreenHeader
        eyebrow="Insights"
        title="Monthly clarity"
        description="Tracked spending only. Not a bank statement."
      />
      <InsightsControlBar data={data} />
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

      <MonthlySnapshotCard data={data} />
      <TimeframeInsightsCard data={data} />

      {data.hasMissingRates ? (
        <p className="text-xs leading-5 text-slate-500">
          Some currencies need a rate before they can be included in converted totals.
        </p>
      ) : null}

      {hasTrackedData && !hasCurrentMonthData ? (
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <p>
            You have tracked history, but no transactions in {data.monthLabel} yet.
          </p>
          {data.isSelectedMonthCurrent && data.hasHistoricalActivity && data.latestActivityMonth ? (
            <Link
              className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              href={buildInsightsHref(data, { month: data.latestActivityMonth })}
            >
              View latest month with activity
            </Link>
          ) : null}
        </div>
      ) : null}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Largest recent expenses</CardTitle>
          <CardDescription>Top tracked expenses from your recent transaction history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.largestRecentExpenses.length ? (
            data.largestRecentExpenses.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.categoryLabel} - {item.occurredLabel}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">No tracked expenses yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">Monthly category budgets</CardTitle>
          <CardDescription>Optional limits for controlled categories in {data.monthLabel}.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.budgetProgress.length ? (
            data.budgetProgress.map((item) => (
              <div key={item.budgetId} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.categoryLabel}</p>
                    <p className="text-xs text-slate-500">
                      {item.spentDisplay} of {item.amountDisplay} used
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.isOverBudget ? "text-rose-700" : "text-slate-800"}`}>
                      {item.isOverBudget ? `${item.remainingDisplay} over` : `${item.remainingDisplay} left`}
                    </p>
                    <BudgetRemoveButton action={deleteBudgetAction} budgetId={item.budgetId} />
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${item.isOverBudget ? "bg-rose-500" : "bg-sky-600"}`}
                    style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{item.percentUsed}% used</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">Set a monthly category budget to track progress here.</p>
          )}
          <BudgetSetup action={upsertBudgetAction} data={data} />
        </CardContent>
      </Card>
    </section>
  );
}
