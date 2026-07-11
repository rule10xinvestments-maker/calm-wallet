"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Eye,
  Info,
  Lightbulb,
  Repeat2,
  X,
} from "lucide-react";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/i18n/locale-provider";
import type { BudgetActionState } from "@/lib/actions/budgets-state";
import { getCategoryVisualsByName } from "@/lib/category-icons";
import { getCategoryLabel, getCategoryLabelKey } from "@/lib/categories/category-labels";
import { t } from "@/lib/i18n";
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
  periodMovementMinor?: number;
  firstOccurredAt?: string;
  firstCreatedAt?: string | null;
};
type MonthPickerMonth = InsightsData["monthPickerYears"][number]["months"][number];
type ChartMode = InsightsData["selectedChartMode"];
type TrendPointSelection = InsightsData["selectedMonthTrendDays"][number] | null;

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

const APPROXIMATE_SYMBOL = "≈";

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
  return data.hasConvertedCurrencies && amountMinor !== 0 ? `${APPROXIMATE_SYMBOL} ` : "";
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

function getInspectMonthFromDate(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : null;
}

function getInspectCategoryValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const labelKey = getCategoryLabelKey(value);
  return labelKey ? labelKey.replace(/^categories\./, "") : value;
}

function buildActivityInspectHref({
  category,
  focusTransaction,
  month,
}: {
  category?: string | null;
  focusTransaction?: string | null;
  month?: string | null;
}) {
  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }
  if (category) {
    params.set("category", category);
  }
  if (focusTransaction) {
    params.set("focusTransaction", focusTransaction);
  }

  const query = params.toString();
  return query ? `/transactions?${query}` : "/transactions";
}

function InspectActivityLink({ href, locale }: { href: string; locale: string }) {
  return (
    <Link
      aria-label={t("activity.inspect.viewInActivity", locale)}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      href={href}
    >
      <Eye aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
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
  const { locale } = useLocale();

  if (data.availableDisplayCurrencies.length <= 1) {
    return null;
  }

  return (
    <div aria-label={t("insights.controls.displayCurrency", locale)} className="flex flex-wrap items-center gap-1 text-xs">
      <span className="sr-only">{t("insights.controls.viewTotalsAs", locale)}</span>
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
  const { locale } = useLocale();

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-end bg-slate-950/30 px-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
    >
      <button aria-label={t("insights.monthPicker.close", locale)} className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} type="button" />
      <div className="relative flex max-h-[80dvh] w-full max-w-[26rem] flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("insights.monthPicker.chooseMonth", locale)}</p>
            <p className="text-xs leading-5 text-slate-500">
              {t("insights.monthPicker.markersUse", locale).replace("{currency}", data.displayCurrency)}
            </p>
          </div>
          <button
            aria-label={t("insights.monthPicker.close", locale)}
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
                        {month.hasActivity ? t("insights.monthPicker.tracked", locale) : t("insights.monthPicker.noActivity", locale)}
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
  const { locale } = useLocale();
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
            aria-label={`${t("insights.monthPicker.chooseMonth", locale)}, ${t("insights.monthPicker.current", locale)} ${data.monthLabel}`}
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
          <div aria-label={t("insights.controls.timeframe", locale)} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
  const { locale } = useLocale();
  const modes: Array<{ mode: ChartMode; label: string }> = [
    { mode: "mix", label: t("insights.mix.title", locale) },
    { mode: "trend", label: t("insights.trend.title", locale) },
    { mode: "bars", label: t("insights.bars.title", locale) },
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
  buttonLabelPrefix,
}: {
  segment: SpendingMixSegment;
  onSegmentChange: (segment: SpendingMixSegment) => void;
  orientation?: "horizontal" | "vertical";
  buttonLabelPrefix?: string;
}) {
  const isVertical = orientation === "vertical";
  const { locale } = useLocale();

  return (
    <div className={`inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1 ${isVertical ? "flex-col" : ""}`}>
      {(["expenses", "income"] as const).map((nextSegment) => {
        const label = nextSegment === "expenses" ? t("insights.expenses", locale) : t("insights.income", locale);

        return (
          <button
            key={nextSegment}
            aria-label={buttonLabelPrefix ? `${buttonLabelPrefix} ${label}` : undefined}
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
            {label}
          </button>
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

function getBarsBucketLabel(bar: InsightsData["timeframeBars"][number]) {
  if (bar.granularity === "day") {
    return formatSpendingDayLabel(bar);
  }

  if (bar.granularity === "week") {
    return bar.rangeLabel ?? bar.label;
  }

  return bar.label;
}

function getBarsBucketRangeLabel(bar: InsightsData["timeframeBars"][number]) {
  if (bar.granularity === "day") {
    return formatSpendingDayLabel(bar);
  }

  return bar.rangeLabel ?? bar.label;
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

function TimeframeTrendChart({
  data,
  selectedDay,
  onSelectedDayChange,
}: {
  data: InsightsData;
  selectedDay: TrendPointSelection;
  onSelectedDayChange: (day: TrendPointSelection) => void;
}) {
  const { locale } = useLocale();
  const days = data.selectedMonthTrendDays;
  const hasIncome = days.some((day) => day.cumulativeIncomeMinor > 0);
  const hasSpending = days.some((day) => day.cumulativeExpenseMinor > 0);
  const chartRootRef = useRef<HTMLDivElement | null>(null);
  const scrubLayerRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const selectedDayIndex = selectedDay ? days.findIndex((day) => day.key === selectedDay.key) : null;
  const effectiveSelectedDayIndex = selectedDayIndex !== null && selectedDayIndex >= 0 ? selectedDayIndex : null;

  if (!hasIncome && !hasSpending) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        {t("insights.trend.noTransactionsThisMonth", locale)}
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
  const selectedX = effectiveSelectedDayIndex === null ? 50 : xForIndex(effectiveSelectedDayIndex);
  const tooltipLeft = Math.min(74, Math.max(6, selectedX));
  const tooltipTranslate = selectedX > 74 ? "-100%" : selectedX < 26 ? "0" : "-50%";
  const note = !hasIncome
    ? t("insights.trend.noIncomeThisMonth", locale)
    : !hasSpending
      ? t("insights.trend.noSpendingThisMonth", locale)
      : null;
  const netTone = selectedDay?.netMinor && selectedDay.netMinor < 0 ? "text-rose-600" : "text-emerald-700";

  const updateSelectedDayFromClientX = (clientX: number) => {
    if (!Number.isFinite(clientX)) {
      return;
    }

    const bounds = scrubLayerRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    onSelectedDayChange(days[getNearestTrendPointIndex(clientX, bounds.left, bounds.width, days.length)] ?? null);
  };

  return (
    <div aria-label="Selected month income and spending trend" className="relative space-y-3" ref={chartRootRef} role="img">
      <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-semibold text-emerald-700">
          {t("insights.income", locale)} {lastTrendDay ? `${getApproxPrefix(data, lastTrendDay.cumulativeIncomeMinor)}${lastTrendDay.cumulativeIncomeDisplay}` : ""}
        </span>
        <span className="font-semibold text-rose-700">
          {t("insights.spending", locale)} {lastTrendDay ? `${getApproxPrefix(data, lastTrendDay.cumulativeExpenseMinor)}${lastTrendDay.cumulativeExpenseDisplay}` : ""}
        </span>
      </div>
      {note ? <p className="text-xs leading-5 text-slate-500">{note}</p> : null}
      {selectedDay ? (
        <div
          className="pointer-events-none absolute top-7 z-10 w-48 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg"
          style={{ left: `${tooltipLeft}%`, transform: `translateX(${tooltipTranslate})` }}
        >
          <p className="font-semibold text-slate-900">{formatSpendingDayLabel(selectedDay)}</p>
          <p className="text-emerald-700">{t("insights.income", locale)}: {getApproxPrefix(data, selectedDay.cumulativeIncomeMinor)}{selectedDay.cumulativeIncomeDisplay}</p>
          <p className="text-rose-700">{t("insights.spending", locale)}: {getApproxPrefix(data, selectedDay.cumulativeExpenseMinor)}{selectedDay.cumulativeExpenseDisplay}</p>
          <p className={netTone}>{t("insights.net", locale)}: {formatTrendNetDisplay(data, selectedDay.netMinor)}</p>
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
        {effectiveSelectedDayIndex !== null ? (
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
        {effectiveSelectedDayIndex !== null && selectedDay ? (
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
  const { locale } = useLocale();
  const visuals = getCategoryVisualsByName(label);
  const CategoryIcon = visuals.icon;
  const displayLabel = getCategoryLabel(label, locale);
  const clampedPercentage = clampCategorySharePercentage(percentage);
  const ringPercentage = clampedPercentage > 0 && clampedPercentage < 4 ? 4 : clampedPercentage;
  const context = segment === "income" ? "income" : "spending";
  const ringBackground =
    ringPercentage <= 0
      ? visuals.bg
      : `conic-gradient(${visuals.primary} 0% ${ringPercentage}%, ${visuals.bg} ${ringPercentage}% 100%)`;

  return (
    <span
      aria-label={`${displayLabel} represents ${clampedPercentage}% of ${context}`}
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
  const { locale } = useLocale();
  const visuals = getCategoryVisualsByName(item.label);
  const CategoryIcon = visuals.icon;
  const incomeMinor = Math.max(item.incomeMinor ?? 0, 0);
  const expenseMinor = Math.max(item.expenseMinor ?? 0, 0);
  const movementMinor = incomeMinor + expenseMinor;
  const incomePercent = movementMinor > 0 ? Math.round((incomeMinor / movementMinor) * 100) : 0;
  const ringBackground =
    movementMinor <= 0
      ? "conic-gradient(#CBD5E1 0% 100%)"
      : incomePercent >= 100
        ? "conic-gradient(#10B981 0% 100%)"
        : incomePercent <= 0
          ? "conic-gradient(#F43F5E 0% 100%)"
          : `conic-gradient(#10B981 0% ${incomePercent}%, #F43F5E ${incomePercent}% 100%)`;

  return (
    <span
      aria-label={`${getCategoryLabel(item.label, locale)} income and spending mix`}
      className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white transition-[background,opacity,transform] duration-200"
      role="img"
      style={{ background: ringBackground }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[4px] rounded-full border border-white bg-white transition-transform duration-200"
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

function getLimitStatusLabel(status: "on-track" | "near" | "over", locale: string) {
  if (status === "over") {
    return t("insights.bars.overLimit", locale);
  }

  if (status === "near") {
    return t("insights.bars.nearLimit", locale);
  }

  return t("insights.bars.onTrack", locale);
}

function getCategoryBubbleActionLabel(label: string, isSelected: boolean, locale: string) {
  const displayLabel = getCategoryLabel(label, locale);

  return isSelected
    ? t("insights.bars.clearCategoryFocusAria", locale).replace("{category}", displayLabel)
    : t("insights.bars.selectCategoryFocusAria", locale).replace("{category}", displayLabel);
}

function getRecurringFrequencyLabel(frequency: BarsRecurringItem["frequency"], locale: string) {
  if (frequency === "weekly") {
    return t("assistant.limits.weekly", locale);
  }

  if (frequency === "yearly") {
    return t("activity.recurring.yearly", locale);
  }

  if (frequency === "monthly") {
    return t("assistant.limits.monthly", locale);
  }

  return t("insights.bars.repeats", locale);
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
  const { locale } = useLocale();
  const visuals = getCategoryVisualsByName(item.label);
  const CategoryIcon = visuals.icon;
  const limit = item.signal?.limit;
  const recurring = item.signal?.recurring?.activeCount ? item.signal.recurring : undefined;

  return (
    <button
      aria-label={getCategoryBubbleActionLabel(item.label, isSelected, locale)}
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
  bucketLabel,
  isFocused = false,
  onInspect,
}: {
  category: BarsCategoryItem;
  bucketLabel: string;
  isFocused?: boolean;
  onInspect: (kind: "limit" | "recurring") => void;
}) {
  const { locale } = useLocale();
  const limit = category.signal?.limit;
  const recurring = category.signal?.recurring?.activeCount ? category.signal.recurring : undefined;
  const visuals = getCategoryVisualsByName(category.label);
  const categoryDisplayLabel = getCategoryLabel(category.label, locale);
  const bucketNoun = bucketLabel.toLowerCase();

  return (
    <div className="-mt-1 rounded-lg border bg-white px-3 py-2.5 shadow-sm transition" style={{ borderColor: visuals.border }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900" style={{ color: visuals.primary }}>
            {categoryDisplayLabel}
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {category.amountDisplay} · {category.dayCount} {category.dayCount === 1 ? bucketNoun : `${bucketNoun}s`} {t("insights.thisPeriod", locale)}
          </p>
          {isFocused ? (
            <p className="text-[11px] leading-4 text-slate-400">
              {t("insights.bars.amountsShowCategoryOnly", locale).replace("{bucket}", bucketLabel).replace("{category}", categoryDisplayLabel)}
            </p>
          ) : null}
        </div>
      </div>
      {limit || recurring ? (
        <div className="mt-2 space-y-1.5">
          {limit ? (
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <CircleGauge aria-hidden="true" className="h-4 w-4 text-sky-700" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">{t("insights.bars.limit", locale)}</p>
                <p className="truncate text-xs text-slate-500">
                  {limit.spentDisplay} {t("insights.limits.of", locale)} {limit.amountDisplay} {t("insights.bars.used", locale).toLowerCase()} ·{" "}
                  {limit.remainingMinor < 0 ? `${limit.remainingDisplay} ${t("insights.bars.over", locale)}` : `${limit.remainingDisplay} ${t("activity.limit.left", locale)}`}
                </p>
              </div>
              <button
                aria-label={`Inspect ${categoryDisplayLabel} limit details`}
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
                <p className="text-xs font-semibold text-slate-800">{t("insights.bars.recurring", locale)}</p>
                <p className="truncate text-xs text-slate-500">
                  {t("insights.bars.activeRecurringCount", locale)
                    .replace("{count}", String(recurring.activeCount))
                    .replace("{item}", t(recurring.activeCount === 1 ? "insights.bars.item" : "insights.bars.items", locale))} ·{" "}
                  {t("insights.bars.monthlyTotal", locale)} ≈ {recurring.monthlyTotalDisplay}
                </p>
              </div>
              <button
                aria-label={`Inspect ${categoryDisplayLabel} recurring details`}
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
  const { locale } = useLocale();

  if (!detail) {
    return null;
  }

  const limit = detail.category.signal?.limit;
  const recurring = detail.category.signal?.recurring?.activeCount ? detail.category.signal.recurring : undefined;
  const categoryDisplayLabel = getCategoryLabel(detail.category.label, locale);

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
        aria-label={`${categoryDisplayLabel} ${detail.kind} details`}
        aria-modal="true"
        className="flex w-full max-w-md flex-col rounded-2xl bg-white p-4 shadow-xl"
        role="dialog"
        style={{ maxHeight: "calc(100dvh - 8.5rem - env(safe-area-inset-bottom))" }}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{categoryDisplayLabel}</p>
            <p className="text-xs text-slate-500">{detail.kind === "limit" ? t("insights.bars.limitDetails", locale) : t("insights.bars.recurringDetails", locale)}</p>
          </div>
          <button
            aria-label={t("insights.bars.closeDetails", locale)}
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
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("assistant.limits.period", locale)}</span><span className="font-medium text-slate-800">{limit.period === "weekly" ? t("assistant.limits.weekly", locale) : t("assistant.limits.monthly", locale)}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("insights.bars.limitAmount", locale)}</span><span className="font-medium text-slate-800">{limit.amountDisplay}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("insights.bars.used", locale)}</span><span className="font-medium text-slate-800">{limit.spentDisplay}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("insights.bars.remaining", locale)}</span><span className="font-medium text-slate-800">{limit.remainingMinor < 0 ? `${limit.remainingDisplay} ${t("insights.bars.over", locale)}` : `${limit.remainingDisplay} ${t("activity.limit.left", locale)}`}</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("insights.bars.percentUsed", locale)}</span><span className="font-medium text-slate-800">{limit.percentUsed}%</span></div>
            <div className="grid grid-cols-[1fr_auto] gap-3"><span className="text-slate-500">{t("insights.bars.status", locale)}</span><span className="font-medium text-slate-800">{getLimitStatusLabel(limit.status, locale)}</span></div>
          </div>
        ) : null}
        {detail.kind === "recurring" && recurring ? (
          <div className="space-y-2">
            {recurring.items.map((item) => (
              <div className="grid grid-cols-[1fr_auto] gap-3 rounded-lg bg-slate-50 px-3 py-2" key={item.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{formatTransactionTitleForDisplay(item.title)}</p>
                  <p className="text-xs text-slate-500">
                    {item.tone} · {getRecurringFrequencyLabel(item.frequency, locale)} · {item.nextDateLabel ?? t("insights.bars.dateNotSet", locale)} · {item.status}
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

function buildBarsExpenseCategoryBreakdown(data: InsightsData): SpendingMixCategoryItem[] {
  const totals = new Map<string, { label: string; amountMinor: number; transactionCount: number; hasUnavailableRate: boolean }>();
  const recentEntriesByKey = new Map([
    ...data.categoryBreakdown.map((item) => [item.key, item.recentEntries] as const),
    ...data.timeframeCategoryBreakdown.map((item) => [item.key, item.recentEntries] as const),
  ]);

  data.timeframeBars.flatMap((bar) => bar.segments).forEach((segment) => {
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
  const { locale } = useLocale();
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null);
  const [barsBreakdownExpanded, setBarsBreakdownExpanded] = useState(false);
  const [detailSheet, setDetailSheet] = useState<BarsDetailSheet>(null);
  const bubbleRefs = useRef(new Map<string, HTMLButtonElement>());
  const isIncome = barsSegment === "income";
  const max = Math.max(...data.timeframeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);
  const granularity = data.timeframeBars[0]?.granularity ?? "month";
  const bucketLabel =
    granularity === "week" ? t("insights.bars.week", locale) : granularity === "month" ? t("insights.bars.month", locale) : t("insights.bars.day", locale);
  const bucketLabelPlural =
    granularity === "week" ? t("insights.bars.weeks", locale) : granularity === "month" ? t("insights.bars.months", locale) : t("insights.bars.days", locale);
  const categoryItems = isIncome ? buildBarsIncomeCategoryBreakdown(data) : buildBarsExpenseCategoryBreakdown(data);
  const categorySignals = isIncome
    ? data.categorySignalsByType?.income ?? {}
    : data.categorySignalsByType?.expenses ?? data.categorySignals ?? {};
  const categoryColorMap = new Map(categoryItems.map((item) => [item.key, getCategoryChartColor(item)]));
  const activeBars = data.timeframeBars.filter((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor) > 0);
  const getSegmentColor = (key: string, label: string) => categoryColorMap.get(key) ?? getCategoryChartColor({ label });
  const context = isIncome ? t("insights.incomeLower", locale) : t("insights.spendingLower", locale);

  useEffect(() => {
    setSelectedDayKey(null);
    setSelectedCategoryKey(null);
    setBarsBreakdownExpanded(false);
    setDetailSheet(null);
  }, [barsSegment, data.selectedMonth, data.selectedTimeframe, data.displayCurrency]);

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
  const topCategoryKey =
    activeCategoryItems.reduce<BarsCategoryItem | null>((largest, item) => {
      if (Math.max(item.amountMinor, 0) <= 0) {
        return largest;
      }

      if (!largest || item.amountMinor > largest.amountMinor) {
        return item;
      }

      return largest;
    }, null)?.key ??
    activeCategoryItems[0]?.key ??
    null;
  const selectedCategoryKeyIsVisible = selectedCategoryKey ? activeCategoryItems.some((item) => item.key === selectedCategoryKey) : false;
  const activeSelectedCategoryKey = selectedCategoryKeyIsVisible ? selectedCategoryKey : null;
  const summaryCategoryKey = activeSelectedCategoryKey ?? topCategoryKey;
  const summaryCategory = summaryCategoryKey ? activeCategoryItems.find((item) => item.key === summaryCategoryKey) ?? null : null;
  const selectedDay = selectedDayKey ? activeBars.find((bar) => bar.key === selectedDayKey) ?? null : null;
  const selectedDayCategoryKeys = new Set((selectedDay ? (isIncome ? selectedDay.incomeSegments : selectedDay.segments) : []).map((segment) => segment.key));
  const summaryBreakdownItems = summaryCategoryKey ? categoryItems.filter((item) => item.key === summaryCategoryKey) : [];
  const visibleBreakdownItems = barsBreakdownExpanded ? categoryItems : summaryBreakdownItems;
  const showBreakdownToggle = categoryItems.length > 1;

  useEffect(() => {
    if (!activeSelectedCategoryKey) {
      return;
    }

    const node = bubbleRefs.current.get(activeSelectedCategoryKey);
    if (typeof node?.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeSelectedCategoryKey]);

  const legend = activeCategoryItems.length ? (
    <div aria-label={`${isIncome ? t("insights.income", locale) : t("insights.expenses", locale)} ${t("insights.bars.categoryBubbles", locale)}`} className="flex scroll-px-3 gap-2 overflow-x-auto px-1 pb-2 pt-1">
      {activeCategoryItems.map((item) => (
        <BarsCategoryBubble
          isDimmed={Boolean(
            activeSelectedCategoryKey
              ? activeSelectedCategoryKey !== item.key
              : selectedDay && !selectedDayCategoryKeys.has(item.key)
          )}
          isSelected={activeSelectedCategoryKey === item.key}
          item={item}
          key={item.key}
          onSelect={() => {
            setSelectedCategoryKey((current) => (current === item.key ? null : item.key));
            setBarsBreakdownExpanded(false);
          }}
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

  const breakdown = categoryItems.length ? (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">
        {barsBreakdownExpanded
          ? t("insights.mix.categoryBreakdown", locale)
          : activeSelectedCategoryKey
            ? t("insights.mix.selectedCategory", locale)
            : t("insights.bars.topCategory", locale)}
      </p>
      <TimeframeCategoryBreakdown
        emptyMessage={isIncome ? t("insights.trend.noIncomeThisMonth", locale) : t("insights.bars.noTrackedSpendingTimeframe", locale)}
        expandable
        inspectMonth={data.selectedMonth}
        items={visibleBreakdownItems}
        onSelect={(key) => setSelectedCategoryKey(key)}
        segment={isIncome ? "income" : "expenses"}
        selectedKey={activeSelectedCategoryKey}
        showIcons
        totalItems={categoryItems}
      />
      {showBreakdownToggle ? (
        <button
          className="text-sm font-medium text-sky-700 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onClick={() => setBarsBreakdownExpanded((current) => !current)}
          type="button"
        >
          {barsBreakdownExpanded ? t("insights.mix.showSelectedOnly", locale) : t("insights.mix.showAllCategories", locale)}
        </button>
      ) : null}
    </div>
  ) : null;

  if (granularity === "day" || granularity === "week") {
    const bucketMax = Math.max(...activeBars.map((bar) => (isIncome ? bar.incomeAmountMinor : bar.amountMinor)), 1);

    if (!activeBars.length) {
      const emptyPeriodLabel = granularity === "day" ? "month" : "period";

      return (
        <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by ${granularity}`} role="img">
          <p className="text-xs leading-5 text-slate-500">
            {t("insights.bars.showingBucketsWithTracked", locale)
              .replace("{buckets}", bucketLabelPlural)
              .replace("{context}", context)}
          </p>
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
            {isIncome
              ? t("insights.bars.noIncomeForPeriod", locale).replace("{period}", emptyPeriodLabel)
              : t("insights.bars.noSpendingForPeriod", locale).replace("{period}", emptyPeriodLabel)}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3" aria-label={`Tracked ${isIncome ? "income" : "spending"} by ${granularity}`} role="img">
        <p className="text-xs leading-5 text-slate-500">
          {t("insights.bars.showingBucketsWithTracked", locale)
            .replace("{buckets}", bucketLabelPlural)
            .replace("{context}", context)}
        </p>
        {legend}
        {summaryCategory ? (
          <BarsCategoryFocusPanel
            bucketLabel={bucketLabel}
            category={summaryCategory}
            isFocused={Boolean(activeSelectedCategoryKey)}
            onInspect={(kind) => setDetailSheet({ category: summaryCategory, kind })}
          />
        ) : null}
        <div className="space-y-2">
          {activeBars.map((bar) => {
            const amountMinor = isIncome ? bar.incomeAmountMinor : bar.amountMinor;
            const amountDisplay = isIncome ? bar.incomeAmountDisplay : bar.amountDisplay;
            const segments = isIncome ? bar.incomeSegments : bar.segments;
            const width = `${Math.max(10, Math.round((amountMinor / bucketMax) * 100))}%`;
            const label = getBarsBucketLabel(bar);
            const isSelected = selectedDayKey === bar.key;
            const containsSelectedCategory = activeSelectedCategoryKey ? segments.some((segment) => segment.key === activeSelectedCategoryKey) : true;
            const isBarDimmed = Boolean(activeSelectedCategoryKey && !containsSelectedCategory);
            const selectedCategorySegment = activeSelectedCategoryKey ? segments.find((segment) => segment.key === activeSelectedCategoryKey) ?? null : null;
            const rowAmountDisplay = selectedCategorySegment?.amountDisplay ?? amountDisplay;
            const rowGridClass =
              granularity === "week" ? "grid-cols-[5.85rem_minmax(0,1fr)_auto]" : "grid-cols-[3.25rem_minmax(0,1fr)_auto]";
            const labelClass = granularity === "week" ? "text-[11px]" : "text-xs";

            return (
              <div className={`space-y-2 transition-opacity ${isBarDimmed ? "opacity-35" : "opacity-100"}`} key={bar.key}>
                <button
                  aria-label={`${label}, ${rowAmountDisplay} ${context}, ${isSelected ? "hide" : "tap for"} category breakdown`}
                  aria-pressed={isSelected}
                  className={`grid w-full ${rowGridClass} items-center gap-2 rounded-lg px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    isSelected ? "bg-slate-50 ring-1 ring-slate-200" : ""
                  }`}
                  onClick={() => setSelectedDayKey(isSelected ? null : bar.key)}
                  type="button"
                >
                  <span className={`whitespace-nowrap ${labelClass} font-medium text-slate-600`}>{label}</span>
                  <span className="h-8 overflow-hidden rounded-lg bg-slate-100">
                    <span
                      aria-label={`${label} tracked ${context} ${amountDisplay}`}
                      className="flex h-full overflow-hidden rounded-lg"
                      style={{ width }}
                    >
                      {segments.map((segment, index) => (
                        <span
                          aria-label={`${label} ${getCategoryLabel(segment.label, locale)} ${context} ${segment.amountDisplay}`}
                          className={`h-full transition-opacity ${
                            index > 0 ? "border-l border-white/80" : ""
                          } ${activeSelectedCategoryKey && containsSelectedCategory && segment.key !== activeSelectedCategoryKey ? "opacity-35" : "opacity-100"}`}
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
                    selectedCategoryKey={activeSelectedCategoryKey}
                    totalDisplay={amountDisplay}
                    totalMinor={amountMinor}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {breakdown}
        <BarsReadOnlyDetailSheet detail={detailSheet} onClose={() => setDetailSheet(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-slate-500">
        {t("insights.bars.showingMonthsWithTracked", locale).replace("{context}", context)}
      </p>
      {legend}
      {summaryCategory ? (
        <BarsCategoryFocusPanel
          bucketLabel={bucketLabel}
          category={summaryCategory}
          isFocused={Boolean(activeSelectedCategoryKey)}
          onInspect={(kind) => setDetailSheet({ category: summaryCategory, kind })}
        />
      ) : null}
      <div
        className="grid min-h-44 grid-cols-[repeat(auto-fit,minmax(2.25rem,1fr))] items-end gap-2"
        aria-label={`Tracked ${isIncome ? "income" : "spending"} by month`}
        role="img"
      >
        {activeBars.map((bar) => {
          const amountMinor = isIncome ? bar.incomeAmountMinor : bar.amountMinor;
          const amountDisplay = isIncome ? bar.incomeAmountDisplay : bar.amountDisplay;
          const segments = isIncome ? bar.incomeSegments : bar.segments;
          const height = amountMinor > 0 ? Math.max(8, Math.round((amountMinor / max) * 128)) : 2;
          const containsSelectedCategory = activeSelectedCategoryKey ? segments.some((segment) => segment.key === activeSelectedCategoryKey) : true;
          const isBarDimmed = Boolean(activeSelectedCategoryKey && !containsSelectedCategory);

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
                        aria-label={`${bar.label} ${getCategoryLabel(segment.label, locale)} ${isIncome ? "income" : "spending"} ${segment.amountDisplay}`}
                        className={`h-full transition-opacity ${
                          activeSelectedCategoryKey && containsSelectedCategory && segment.key !== activeSelectedCategoryKey ? "opacity-35" : "opacity-100"
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
      {breakdown}
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
  const { locale } = useLocale();
  const label = getBarsBucketRangeLabel(bar);
  const context = isIncome ? t("insights.incomeLower", locale) : t("insights.spendingLower", locale);
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
        <p className="min-w-0 truncate text-right text-xs font-medium text-slate-500">{t("insights.bars.total", locale)} {totalDisplay}</p>
      </div>
      <div className="space-y-1.5">
        {orderedSegments.map((segment) => {
          const visuals = getCategoryVisualsByName(segment.label);
          const SegmentIcon = visuals.icon;
          const percentage = totalMinor > 0 ? Math.round((Math.max(segment.amountMinor, 0) / totalMinor) * 100) : 0;
          const displayLabel = getCategoryLabel(segment.label, locale);

          return (
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_2.5rem] items-center gap-2 text-xs" key={segment.key}>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                style={{ backgroundColor: visuals.bg, borderColor: visuals.border, color: visuals.primary }}
              >
                <SegmentIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 truncate font-medium text-slate-700">{displayLabel}</span>
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
  const { locale } = useLocale();
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
        <p className="text-sm font-semibold text-slate-900">
          {mixBreakdownExpanded ? t("insights.mix.categoryBreakdown", locale) : t("insights.mix.selectedCategory", locale)}
        </p>
        <SpendingMixRows
          displayCurrency={data.displayCurrency}
          inspectMonth={data.selectedMonth}
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
            {mixBreakdownExpanded ? t("insights.mix.showSelectedOnly", locale) : t("insights.mix.showAllCategories", locale)}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TimeframeCategoryBreakdown({
  inspectMonth,
  items,
  onSelect,
  segment = "expenses",
  selectedKey,
  showIcons = false,
  totalItems,
  emptyMessage = "No tracked spending in this timeframe yet.",
  expandable = false,
}: {
  inspectMonth: string;
  items: SpendingMixCategoryItem[];
  onSelect?: (key: string) => void;
  segment?: SpendingMixSegment;
  selectedKey?: string | null;
  showIcons?: boolean;
  totalItems?: SpendingMixCategoryItem[];
  emptyMessage?: string;
  expandable?: boolean;
}) {
  const { locale } = useLocale();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = (totalItems ?? items).reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);
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
        const displayLabel = getCategoryLabel(item.label, locale);
        const countLabel = `${percent}% ${t("insights.of", locale)} ${isIncome ? t("insights.incomeLower", locale) : t("insights.spendingLower", locale)} - ${formatTransactionCountLabel(item.transactionCount, locale)}`;
        const inspectCategory = getInspectCategoryValue(item.key) ?? getInspectCategoryValue(item.label);

        if (expandable) {
          const isSelected = selectedKey === item.key;

          return (
            <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={item.key}>
              <div>
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? t("insights.hide", locale) : t("insights.show", locale)} ${displayLabel} ${t("insights.entries", locale)}`}
                  className={`grid min-w-0 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                    showIcons ? "grid-cols-[2rem_1fr] gap-3" : "grid-cols-1"
                  } ${isSelected ? "rounded-xl bg-sky-50/60 p-1 ring-1 ring-sky-100" : ""}`}
                  onClick={() => {
                    onSelect?.(item.key);
                    setExpandedKey(isExpanded ? null : item.key);
                  }}
                  type="button"
                >
                  {showIcons ? <CategoryShareIcon label={item.label} percentage={percent} segment={segment} /> : null}
                  <span className="min-w-0 space-y-2">
                    <span className="grid grid-cols-[1fr_auto] items-start gap-3">
                      <span className="min-w-0">
                        <span className="truncate text-sm font-medium text-slate-900">{displayLabel}</span>
                        <span className="block text-xs text-slate-500">{countLabel}</span>
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-slate-800">{item.amountDisplay}</span>
                    </span>
                    <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                      <span
                        aria-label={`${displayLabel} ${isIncome ? "income" : "spending"} share ${percent}%`}
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
              </div>
              {showIcons && !isIncome && getCategoryLabelKey(item.label) === "categories.needsCategory" ? (
                <Link
                  className="ml-11 mt-2 inline-flex rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                  href="/transactions?view=needs-review"
                >
                  {t("common.review", locale)}
                </Link>
              ) : null}
              {isExpanded ? (
                <div className={showIcons ? "ml-11 mt-2 rounded-lg bg-slate-50 px-3 py-2" : "mt-2 rounded-lg bg-slate-50 px-3 py-2"}>
                  <div className="space-y-2">
                    {item.recentEntries.map((entry) => (
                      <div className="grid grid-cols-[1fr_auto] items-start gap-3" key={entry.id}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{formatTransactionTitleForDisplay(entry.title)}</p>
                          <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-700">{entry.amountDisplay}</p>
                          <InspectActivityLink
                            href={buildActivityInspectHref({
                              category: inspectCategory,
                              focusTransaction: entry.id,
                              month: getInspectMonthFromDate(entry.occurredAt) ?? inspectMonth,
                            })}
                            locale={locale}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div className="grid grid-cols-[1fr_auto] items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0" key={item.key}>
            <div className={`grid min-w-0 ${showIcons ? "grid-cols-[2rem_1fr] gap-3" : "grid-cols-1"}`}>
              {showIcons ? (
                <CategoryShareIcon label={item.label} percentage={percent} segment={segment} />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{displayLabel}</p>
                  {showIcons && !isIncome && getCategoryLabelKey(item.label) === "categories.needsCategory" ? (
                    <Link
                      className="rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                      href="/transactions?view=needs-review"
                    >
                      {t("common.review", locale)}
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

function formatTransactionCountLabel(count: number, locale: string) {
  return `${count} ${t(count === 1 ? "transactions.transaction" : "transactions.transactions", locale).toLowerCase()}`;
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

function getTrendEntryDisplayMinor(entry: TrendCategoryItem["recentEntries"][number]) {
  return Math.max(entry.displayAmountMinor ?? entry.amountMinor, 0);
}

function getTrendEntryTime(entry: TrendCategoryItem["recentEntries"][number]) {
  const occurredTime = new Date(entry.occurredAt).getTime();
  return Number.isFinite(occurredTime) ? occurredTime : 0;
}

function isTrendEntryThroughDate(entry: TrendCategoryItem["recentEntries"][number], selectedDay: TrendPointSelection) {
  if (!selectedDay) {
    return true;
  }

  return getTrendEntryTime(entry) <= new Date(`${selectedDay.key}T23:59:59.999`).getTime();
}

function formatTrendScopedAmount(amountMinor: number, displayCurrency: string, entries: TrendCategoryItem["recentEntries"]) {
  const prefix = entries.some((entry) => entry.displayAmountApproximate) && amountMinor !== 0 ? `${APPROXIMATE_SYMBOL} ` : "";
  return `${prefix}${formatMoney(amountMinor, displayCurrency)}`;
}

function getTrendScopedNetDisplay(amountMinor: number, displayCurrency: string, entries: TrendCategoryItem["recentEntries"]) {
  const display = formatTrendScopedAmount(Math.abs(amountMinor), displayCurrency, entries);

  if (amountMinor > 0) {
    return `+${display}`;
  }

  if (amountMinor < 0) {
    return `-${display}`;
  }

  return display;
}

function buildCumulativeTrendItems({
  displayCurrency,
  items,
  selectedDay,
}: {
  displayCurrency: string;
  items: TrendCategoryItem[];
  selectedDay: TrendPointSelection;
}): TrendCategoryItem[] {
  return items
    .map((item) => {
      const periodMovementMinor =
        item.movementMinor ?? item.recentEntries.reduce((sum, entry) => sum + getTrendEntryDisplayMinor(entry), 0) ?? Math.abs(item.amountMinor);
      const scopedEntries = item.recentEntries.filter((entry) => isTrendEntryThroughDate(entry, selectedDay));
      const incomeEntries = scopedEntries.filter((entry) => entry.transactionType === "income");
      const expenseEntries = scopedEntries.filter((entry) => entry.transactionType !== "income");
      const incomeMinor = incomeEntries.reduce((sum, entry) => sum + getTrendEntryDisplayMinor(entry), 0);
      const expenseMinor = expenseEntries.reduce((sum, entry) => sum + getTrendEntryDisplayMinor(entry), 0);
      const movementMinor = incomeMinor + expenseMinor;
      const netMinor = incomeMinor - expenseMinor;
      const firstEntry = sortTrendDetailEntries(item.recentEntries).at(-1);

      return {
        ...item,
        amountMinor: incomeMinor > 0 && expenseMinor === 0 ? incomeMinor : expenseMinor > 0 && incomeMinor === 0 ? expenseMinor : Math.abs(netMinor),
        amountDisplay:
          incomeMinor > 0 && expenseMinor === 0
            ? formatTrendScopedAmount(incomeMinor, displayCurrency, incomeEntries)
            : expenseMinor > 0 && incomeMinor === 0
              ? formatTrendScopedAmount(expenseMinor, displayCurrency, expenseEntries)
              : getTrendScopedNetDisplay(netMinor, displayCurrency, scopedEntries),
        incomeMinor,
        incomeDisplay: formatTrendScopedAmount(incomeMinor, displayCurrency, incomeEntries),
        expenseMinor,
        expenseDisplay: formatTrendScopedAmount(expenseMinor, displayCurrency, expenseEntries),
        netMinor,
        netDisplay: getTrendScopedNetDisplay(netMinor, displayCurrency, scopedEntries),
        movementMinor,
        periodMovementMinor,
        transactionCount: scopedEntries.length,
        recentEntries: scopedEntries,
        firstOccurredAt: firstEntry?.occurredAt,
        firstCreatedAt: firstEntry?.createdAt,
      };
    })
    .filter((item) => (item.periodMovementMinor ?? 0) > 0)
    .sort((left, right) => {
      const leftOccurred = new Date(left.firstOccurredAt ?? "").getTime();
      const rightOccurred = new Date(right.firstOccurredAt ?? "").getTime();
      const occurredDelta = (Number.isFinite(leftOccurred) ? leftOccurred : Number.MAX_SAFE_INTEGER) - (Number.isFinite(rightOccurred) ? rightOccurred : Number.MAX_SAFE_INTEGER);
      if (occurredDelta !== 0) {
        return occurredDelta;
      }

      const leftCreated = new Date(left.firstCreatedAt ?? "").getTime();
      const rightCreated = new Date(right.firstCreatedAt ?? "").getTime();
      const createdDelta = (Number.isFinite(leftCreated) ? leftCreated : Number.MAX_SAFE_INTEGER) - (Number.isFinite(rightCreated) ? rightCreated : Number.MAX_SAFE_INTEGER);
      if (createdDelta !== 0) {
        return createdDelta;
      }

      return (right.movementMinor ?? Math.abs(right.amountMinor)) - (left.movementMinor ?? Math.abs(left.amountMinor)) || left.label.localeCompare(right.label);
    });
}

function TrendCategoryEntryList({
  category,
  entries,
  inspectMonth,
  tone,
}: {
  category: string | null;
  entries: TrendCategoryItem["recentEntries"];
  inspectMonth: string;
  tone: "income" | "expense";
}) {
  const { locale } = useLocale();
  const amountClass = tone === "income" ? "text-emerald-700" : "text-rose-700";

  if (!entries.length) {
    return <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{t("insights.detailsCouldNotLoad", locale)}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const amountDisplay = entry.displayAmountDisplay ?? entry.amountDisplay;
        const signedAmount =
          tone === "income" || amountDisplay.startsWith("-") || amountDisplay.startsWith("+") || amountDisplay.startsWith(`${APPROXIMATE_SYMBOL} `)
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
                    {t("insights.bars.recurring", locale)}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">{entry.occurredLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className={`whitespace-nowrap text-sm font-semibold ${amountClass}`}>{signedAmount}</p>
              <InspectActivityLink
                href={buildActivityInspectHref({
                  category,
                  focusTransaction: entry.id,
                  month: getInspectMonthFromDate(entry.occurredAt) ?? inspectMonth,
                })}
                locale={locale}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendCategoryExplorer({
  displayCurrency,
  inspectMonth,
  items,
  onClearSelectedDay,
  selectedDay,
}: {
  displayCurrency: string;
  inspectMonth: string;
  items: TrendCategoryItem[];
  onClearSelectedDay: () => void;
  selectedDay: TrendPointSelection;
}) {
  const { locale } = useLocale();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const sortedItems = buildCumulativeTrendItems({ displayCurrency, items, selectedDay });

  useEffect(() => {
    if (selectedKey && !sortedItems.some((item) => item.key === selectedKey)) {
      setSelectedKey(null);
    }
  }, [selectedKey, sortedItems]);

  if (!items.length) {
    return <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">{t("insights.trend.noMoneyMovement", locale)}</p>;
  }

  const visibleLimit = 12;
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
  const selectedMovementMinor = selectedIncomeMinor + selectedExpenseMinor;
  const selectedHasMovement = selectedMovementMinor > 0;
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
      : selectedHasMovement
        ? "text-rose-700"
        : "text-slate-500";
  const selectedDayLabel = selectedDay ? formatSpendingDayLabel(selectedDay) : null;
  const selectedInspectCategory = selectedItem
    ? getInspectCategoryValue(selectedItem.key) ?? getInspectCategoryValue(selectedItem.label)
    : null;

  if (!sortedItems.length) {
    return (
      <div className="space-y-2">
        {selectedDayLabel ? (
          <button
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick={onClearSelectedDay}
            type="button"
          >
            {t("insights.trend.through", locale)} {selectedDayLabel} <X aria-hidden="true" className="h-3 w-3" />
          </button>
        ) : null}
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          {selectedDayLabel ? t("insights.trend.noEntriesBy", locale).replace("{date}", selectedDayLabel) : t("insights.trend.noMoneyMovement", locale)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {selectedDayLabel ? (
        <button
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          onClick={onClearSelectedDay}
          type="button"
        >
          {t("insights.trend.through", locale)} {selectedDayLabel} <X aria-hidden="true" className="h-3 w-3" />
        </button>
      ) : null}
      <div className="grid justify-center gap-1 [grid-template-columns:repeat(auto-fit,minmax(2.375rem,2.625rem))]">
        {gridItems.map((item) => {
          const isSelected = selectedKey === item.key;
          const hasMovement = (item.movementMinor ?? 0) > 0;
          const displayLabel = getCategoryLabel(item.label, locale);

          return (
            <button
              aria-label={`${isSelected ? t("insights.hide", locale) : t("insights.show", locale)} ${displayLabel} ${t("insights.details", locale)}`}
              aria-pressed={isSelected}
              className={`flex h-10 w-10 items-center justify-center rounded-full p-0.5 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isSelected ? "bg-slate-100 opacity-100 ring-2 ring-slate-300 scale-105" : hasMovement ? "opacity-100 hover:bg-slate-50" : "opacity-35 hover:opacity-65"
              }`}
              key={item.key}
              onClick={() => setSelectedKey(isSelected ? null : item.key)}
              title={displayLabel}
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
          {showAllCategories ? t("insights.showFewer", locale) : t("insights.showAll", locale)}
        </button>
      ) : null}
      {selectedItem ? (
        <div className="rounded-lg bg-slate-50 px-3 py-3">
          <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{getCategoryLabel(selectedItem.label, locale)}</p>
              <p className="text-xs text-slate-500">{formatTransactionCountLabel(selectedItem.transactionCount, locale)}</p>
              {selectedDayLabel ? <p className="text-xs text-slate-500">{t("insights.trend.through", locale)} {selectedDayLabel}</p> : null}
            </div>
            <p className={`whitespace-nowrap text-sm font-semibold ${selectedAmountClass}`}>{selectedHasMovement ? selectedAmountDisplay : formatMoney(0, displayCurrency)}</p>
          </div>
          {selectedHasMovement ? <div className="mb-3 grid gap-2 text-xs text-slate-600">
            {selectedIncomeMinor > 0 ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>{t("insights.income", locale)}</span>
                <span className="font-medium text-emerald-700">{selectedItem.incomeDisplay ?? formatMoney(selectedIncomeMinor, displayCurrency)}</span>
              </div>
            ) : null}
            {selectedExpenseMinor > 0 ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <span>{t("insights.spending", locale)}</span>
                <span className="font-medium text-rose-700">{selectedItem.expenseDisplay ?? formatMoney(selectedExpenseMinor, displayCurrency)}</span>
              </div>
            ) : null}
          </div> : null}
          {!selectedHasMovement && selectedDayLabel ? (
            <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">{t("insights.trend.noEntriesBy", locale).replace("{date}", selectedDayLabel)}</p>
          ) : selectedIsMixed ? (
            <div className="space-y-3">
              {selectedIncomeEntries.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">{t("insights.income", locale)}</p>
                  <TrendCategoryEntryList category={selectedInspectCategory} entries={selectedIncomeEntries} inspectMonth={inspectMonth} tone="income" />
                </div>
              ) : null}
              {selectedExpenseEntries.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">{t("insights.spending", locale)}</p>
                  <TrendCategoryEntryList category={selectedInspectCategory} entries={selectedExpenseEntries} inspectMonth={inspectMonth} tone="expense" />
                </div>
              ) : null}
              {!selectedIncomeEntries.length && !selectedExpenseEntries.length ? <p className="text-xs text-slate-500">{t("insights.detailsCouldNotLoad", locale)}</p> : null}
            </div>
          ) : (
            <TrendCategoryEntryList
              category={selectedInspectCategory}
              entries={selectedIsIncomeOnly ? selectedIncomeEntries : selectedExpenseEntries}
              inspectMonth={inspectMonth}
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
    hasMissingRates,
  };
}

function getSnapshotHero(data: InsightsData) {
  if (data.selectedTimeframe === "All") {
    return {
      labelKey: "insights.trackedBalance",
      amountMinor: data.trackedBalanceDisplayMinor,
    };
  }

  return {
    labelKey: data.selectedTimeframe === "1M" ? "insights.monthlyNet" : "insights.periodNet",
    amountMinor: data.selectedPeriodIncomeDisplayMinor - data.selectedPeriodExpenseDisplayMinor,
  };
}

function MonthlySnapshotCard({ data }: { data: InsightsData }) {
  const { locale } = useLocale();
  const [isConversionDetailsOpen, setIsConversionDetailsOpen] = useState(false);
  const conversionDetails = getMonthlySnapshotConversionDetails(data);
  const hero = getSnapshotHero(data);

  return (
    <Card className="rounded-lg" data-testid="monthly-snapshot-card">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{t("insights.snapshot.title", locale)}</CardTitle>
            <CardDescription>{data.monthLabel}</CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">{data.displayCurrency}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">{t(hero.labelKey, locale)}</p>
          <p className="whitespace-nowrap text-2xl font-semibold text-slate-900">
            {getApproxPrefix(data, hero.amountMinor)}
            {formatMoney(hero.amountMinor, data.displayCurrency)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-[11px] font-medium text-emerald-700">{t("insights.income", locale)}</p>
            <p className="whitespace-nowrap text-sm font-semibold text-emerald-800">
              {getApproxPrefix(data, data.selectedPeriodIncomeDisplayMinor)}
              {formatMoney(data.selectedPeriodIncomeDisplayMinor, data.displayCurrency)}
            </p>
          </div>
          <div className="rounded-lg bg-rose-50 px-3 py-2">
            <p className="text-[11px] font-medium text-rose-700">{t("insights.spending", locale)}</p>
            <p className="whitespace-nowrap text-sm font-semibold text-rose-800">
              {getApproxPrefix(data, data.selectedPeriodExpenseDisplayMinor)}
              {formatMoney(data.selectedPeriodExpenseDisplayMinor, data.displayCurrency)}
            </p>
          </div>
        </div>
        <div className="text-xs leading-5 text-slate-500">
          <p>
            {t("insights.snapshot.trackedTransactionCount", locale)
              .replace("{count}", String(data.selectedPeriodTransactionCount))
              .replace("{entry}", t(data.selectedPeriodTransactionCount === 1 ? "transactions.transaction" : "transactions.transactions", locale).toLowerCase())}
          </p>
          {conversionDetails.hasConvertedEntries ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70">
              <button
                aria-expanded={isConversionDetailsOpen}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-slate-600"
                onClick={() => setIsConversionDetailsOpen((current) => !current)}
                type="button"
              >
                <span>{t("insights.converted.contains", locale)}</span>
                <Info aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" strokeWidth={2.2} />
              </button>
              {isConversionDetailsOpen ? (
                <div className="border-t border-slate-200 px-3 pb-3 pt-2 text-xs leading-5 text-slate-600">
                  <p className="font-semibold text-slate-800">{t("insights.converted.included", locale)}</p>
                  {conversionDetails.income.length ? (
                    <div className="mt-2">
                      <p className="font-medium text-slate-700">{t("insights.income", locale)}</p>
                      <div className="mt-1 grid gap-1">
                        {conversionDetails.income.map((breakdown) => (
                          <p key={`income-${breakdown.currency}`}>{formatOriginalCurrencyAmount(breakdown.incomeMinor, breakdown.currency)}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {conversionDetails.spending.length ? (
                    <div className="mt-2">
                      <p className="font-medium text-slate-700">{t("insights.spending", locale)}</p>
                      <div className="mt-1 grid gap-1">
                        {conversionDetails.spending.map((breakdown) => (
                          <p key={`spending-${breakdown.currency}`}>{formatOriginalCurrencyAmount(breakdown.expenseMinor, breakdown.currency)}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <p className="mt-2 text-slate-500">{t("insights.converted.shownInCurrency", locale).replace("{currency}", data.displayCurrency)}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {conversionDetails.hasMissingRates ? <p className="mt-2">{t("insights.converted.missingRateNote", locale)}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function getCalmInsightParams(insight: NonNullable<InsightsData["calmInsight"]>, locale: string) {
  const params: Record<string, string | number> = {};

  Object.entries(insight.variables ?? {}).forEach(([key, value]) => {
    if (key === "categoryLabel") {
      params[key] = getSafeCalmInsightCategoryLabel({
        canonicalCategory: insight.categoryMeta?.canonicalCategory,
        displayLabel: insight.categoryMeta?.displayLabel ?? value,
        locale,
      });
      return;
    }

    if (key === "previousCategoryLabel") {
      params[key] = getSafeCalmInsightCategoryLabel({ displayLabel: value, locale });
      return;
    }

    params[key] = value;
  });

  return params;
}

function isUuidLike(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function getSafeCalmInsightCategoryLabel({
  canonicalCategory,
  displayLabel,
  locale,
}: {
  canonicalCategory?: string | null;
  displayLabel: unknown;
  locale: string;
}) {
  const candidateLabel = typeof displayLabel === "string" || typeof displayLabel === "number" ? String(displayLabel).trim() : "";
  const canonical = typeof canonicalCategory === "string" ? canonicalCategory.trim() : "";

  if (!candidateLabel || isUuidLike(candidateLabel) || (canonical && candidateLabel === canonical && isUuidLike(canonical))) {
    return t("insights.calmInsight.genericCategoryLabel", locale);
  }

  return getCategoryLabel(candidateLabel, locale);
}

function isCategoryCalmInsight(insight: NonNullable<InsightsData["calmInsight"]>) {
  return Boolean(insight.categoryMeta);
}

function CalmInsightCard({ data }: { data: InsightsData }) {
  const { locale } = useLocale();
  const insight = data.calmInsight;

  if (!insight) {
    return null;
  }

  const params = getCalmInsightParams(insight, locale);
  const categoryVisuals = isCategoryCalmInsight(insight)
    ? getCategoryVisualsByName(insight.categoryMeta?.iconKey ?? insight.categoryMeta?.displayLabel ?? insight.categoryMeta?.canonicalCategory)
    : null;
  const CategoryIcon = categoryVisuals?.icon;

  return (
    <Card className="rounded-lg border-sky-100 bg-sky-50/45" data-testid="calm-insight-card">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-sky-700">
          <span className="inline-flex size-7 items-center justify-center rounded-full bg-white text-sky-700 shadow-sm">
            <Lightbulb aria-hidden="true" className="size-3.5" />
          </span>
          <span>{t("insights.calmInsight.eyebrow", locale)}</span>
        </div>
        <div className="flex gap-3">
          {CategoryIcon && categoryVisuals ? (
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border"
              data-testid="calm-insight-category-icon"
              data-category-color={categoryVisuals.primary}
              style={{ backgroundColor: categoryVisuals.bg, borderColor: categoryVisuals.border, color: categoryVisuals.primary }}
            >
              <CategoryIcon aria-hidden="true" className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold leading-6 text-slate-900">{t(insight.titleKey, locale, params)}</p>
            <p className="text-sm leading-5 text-slate-600">{t(insight.bodyKey, locale, params)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeframeInsightsCard({ data, onSelect }: { data: InsightsData; onSelect: (updates: InsightsSelectionUpdate) => void }) {
  const { locale } = useLocale();
  const [mixSegment, setMixSegment] = useState<SpendingMixSegment>("expenses");
  const [barsSegment, setBarsSegment] = useState<SpendingMixSegment>("expenses");
  const [selectedTrendDay, setSelectedTrendDay] = useState<TrendPointSelection>(null);
  const activeSegment = data.selectedChartMode === "bars" ? barsSegment : mixSegment;
  const trendBreakdownItems = data.trendCategoryBreakdown ?? [];
  const isTrend = data.selectedChartMode === "trend";
  const periodContextLabel = data.selectedTimeframe === "1M" ? data.monthLabel : data.timeframeLabel;
  const primaryValueLine =
    activeSegment === "income"
      ? `${t("insights.income", locale)} ${getApproxPrefix(data, data.selectedPeriodIncomeDisplayMinor)}${formatMoney(
          data.selectedPeriodIncomeDisplayMinor,
          data.displayCurrency,
        )}`
      : `${t("insights.spending", locale)} ${getApproxPrefix(data, data.selectedPeriodExpenseDisplayMinor)}${formatMoney(
          data.selectedPeriodExpenseDisplayMinor,
          data.displayCurrency,
        )}`;
  const contextLine = isTrend
    ? `${periodContextLabel} · ${t("insights.trend.incomeAndSpendingTrend", locale)}`
    : `${periodContextLabel} · ${data.displayCurrency} ${t("insights.tracked", locale)} ${activeSegment === "income" ? t("insights.incomeLower", locale) : t("insights.expensesLower", locale)}`;

  useEffect(() => {
    setSelectedTrendDay(null);
  }, [data.selectedChartMode, data.selectedMonth, data.selectedTimeframe, data.displayCurrency]);

  return (
    <Card className="rounded-lg" data-testid="timeframe-insights-card">
      <CardHeader className="p-4 pb-1">
        <div className="flex items-start justify-between gap-3" data-testid="tracked-view-header-row">
          <div className="space-y-1">
            <CardTitle className="text-lg">{t("insights.trackedView", locale)}</CardTitle>
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
        {data.selectedChartMode === "trend" ? (
          <TimeframeTrendChart data={data} selectedDay={selectedTrendDay} onSelectedDayChange={setSelectedTrendDay} />
        ) : null}
        {data.selectedChartMode === "bars" ? <TimeframeBarsChart barsSegment={barsSegment} data={data} /> : null}
        {data.selectedChartMode === "mix" ? <TimeframeMixChart data={data} segment={mixSegment} /> : null}
        {isTrend ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">{t("insights.trend.categoriesOnTrend", locale)}</p>
            <TrendCategoryExplorer
              displayCurrency={data.displayCurrency}
              inspectMonth={data.selectedMonth}
              items={trendBreakdownItems}
              onClearSelectedDay={() => setSelectedTrendDay(null)}
              selectedDay={selectedTrendDay}
            />
          </div>
        ) : null}
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
  const { locale } = useLocale();

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
              aria-label={`${getCategoryLabel(donutSegments[0]!.label, locale)}, ${donutSegments[0]!.amountDisplay}, ${donutSegments[0]!.percent} percent of ${context}`}
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
                aria-label={`${getCategoryLabel(item.label, locale)}, ${item.amountDisplay}, ${item.percent} percent of ${context}`}
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
              aria-valuetext={`${getCategoryLabel(selectedItem.label, locale)}, ${selectedItem.amountDisplay}, ${selectedItem.percent} percent of ${context}`}
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
            <p className="w-full truncate text-[10px] font-semibold leading-3 text-slate-900">{getCategoryLabel(selectedItem.label, locale)}</p>
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
  focusTransactionId: string | null;
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
      focusTransactionId: group.count === 1 ? group.firstEntry.id : null,
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
  inspectMonth,
  onSelect,
  selectedKey,
  segment,
  visibleItems,
}: {
  displayCurrency: string;
  inspectMonth: string;
  items: InsightsData["categoryBreakdown"];
  onSelect: (key: string) => void;
  selectedKey: string | null;
  segment: SpendingMixSegment;
  visibleItems?: InsightsData["categoryBreakdown"];
}) {
  const { locale } = useLocale();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const total = items.reduce((sum, item) => sum + Math.max(item.amountMinor, 0), 0);
  const renderedItems = visibleItems ?? items;

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-500">
        {segment === "income"
          ? t("insights.mix.noIncomeThisMonth", locale)
          : t("insights.mix.noMonthlySpending", locale)}
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
        const displayLabel = getCategoryLabel(item.label, locale);
        const inspectCategory = getInspectCategoryValue(item.key) ?? getInspectCategoryValue(item.label);

        return (
          <div key={item.key} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
            <button
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? t("insights.hide", locale) : t("insights.show", locale)} ${displayLabel} ${t("insights.entries", locale)}`}
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
                      <span className="font-medium text-slate-900">{displayLabel}</span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-right text-sm font-semibold text-slate-800">{item.amountDisplay}</span>
                </span>
                <span className="grid grid-cols-[1fr_auto] gap-3">
                  <span className="text-xs text-slate-500">
                    {item.transactionCount} {t(item.transactionCount === 1 ? "insights.entry" : "insights.entries", locale)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{percent}%</span>
                </span>
                <span className="block h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    aria-label={`${displayLabel} ${segment === "income" ? "income" : "spending"} share ${percent}%`}
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
            {getCategoryLabelKey(item.label) === "categories.needsCategory" ? (
              <Link
                className="ml-11 mt-2 inline-flex rounded-full border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                href="/transactions?view=needs-review"
              >
                {t("common.review", locale)}
              </Link>
            ) : null}
            <div className="ml-11 min-w-0 space-y-2">
              {isExpanded ? (
                <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                  <div className="space-y-2">
                    {groupedEntries.map((entry) => (
                      <div key={entry.key} className="grid grid-cols-[1fr_auto] items-start gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{entry.title}</p>
                          <p className="text-xs text-slate-500">{entry.metaLabel}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="whitespace-nowrap text-sm font-semibold text-slate-700">{entry.amountDisplay}</p>
                          {entry.focusTransactionId ? (
                            <InspectActivityLink
                              href={buildActivityInspectHref({
                                category: inspectCategory,
                                focusTransaction: entry.focusTransactionId,
                                month: getInspectMonthFromDate(entry.latestOccurredAt) ?? inspectMonth,
                              })}
                              locale={locale}
                            />
                          ) : null}
                        </div>
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

function LargestEntriesCard({ data }: { data: InsightsData }) {
  const { locale } = useLocale();
  const [segment, setSegment] = useState<SpendingMixSegment>("expenses");
  const isIncome = segment === "income";
  const items = isIncome ? data.largestRecentIncome : data.largestRecentExpenses;
  const totalMinor = isIncome ? data.selectedPeriodIncomeDisplayMinor : data.selectedPeriodExpenseDisplayMinor;
  const periodLabel = data.selectedTimeframe === "1M" ? data.monthLabel : t("insights.thisPeriod", locale);
  const title =
    data.selectedTimeframe === "1M"
      ? isIncome
        ? t("insights.largest.incomeThisMonth", locale)
        : t("insights.largest.expensesThisMonth", locale)
      : isIncome
        ? t("insights.largest.incomeThisPeriod", locale)
        : t("insights.largest.expensesThisPeriod", locale);
  const helper =
    data.selectedTimeframe === "1M"
      ? t(isIncome ? "insights.largest.moneyInFromPeriod" : "insights.largest.spendingFromPeriod", locale).replace("{period}", periodLabel)
      : t(isIncome ? "insights.largest.moneyInFromThisPeriod" : "insights.largest.spendingFromThisPeriod", locale);
  const shareContext = data.selectedTimeframe === "1M" ? t("insights.monthly", locale) : t("insights.period", locale);

  return (
    <Card className="rounded-lg" data-testid="largest-entries-card">
      <CardHeader className="space-y-2 p-4 pb-2">
        <CardTitle className="text-lg leading-snug">{title}</CardTitle>
        <SpendingSegmentControls buttonLabelPrefix={t("insights.largest.title", locale)} orientation="horizontal" segment={segment} onSegmentChange={setSegment} />
        <CardDescription>{helper}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        {items.length ? (
          items.map((item) => {
            const visuals = getCategoryVisualsByName(item.categoryLabel);
            const CategoryIcon = visuals.icon;
            const percent = totalMinor > 0 ? Math.round((item.amountMinor / totalMinor) * 100) : null;
            const categoryDisplayLabel = getCategoryLabel(item.categoryLabel, locale);

            return (
              <div key={item.id} className="grid grid-cols-[1.25rem_1fr_auto] items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <CategoryIcon aria-hidden="true" className="mt-0.5 h-4 w-4" style={{ color: visuals.primary }} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{formatTransactionTitleForDisplay(item.title)}</p>
                  <p className="text-xs text-slate-500">
                    {categoryDisplayLabel}{" \u00b7 "}{item.occurredLabel}
                  </p>
                  {percent !== null ? (
                    <p className="text-xs text-slate-500">
                      {percent}% {t("insights.of", locale)} {shareContext} {isIncome ? t("insights.incomeLower", locale) : t("insights.spendingLower", locale)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className={`whitespace-nowrap text-sm font-semibold ${isIncome ? "text-emerald-700" : "text-rose-700"}`}>{item.amountDisplay}</p>
                  <InspectActivityLink
                    href={buildActivityInspectHref({
                      category: getInspectCategoryValue(item.categoryLabel),
                      focusTransaction: item.id,
                      month: getInspectMonthFromDate(item.occurredAt) ?? data.selectedMonth,
                    })}
                    locale={locale}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm leading-6 text-slate-500">{isIncome ? t("insights.largest.noIncomeEntries", locale) : t("insights.largest.noSpendingEntries", locale)}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function InsightsOverview({ data, loadError = false }: InsightsOverviewProps) {
  const { locale } = useLocale();
  const router = useRouter();
  const [activeData, setActiveData] = useState<InsightsData>(data);
  const hasTrackedData = activeData.trackedTransactionCount > 0;
  const hasCurrentMonthData = activeData.currentMonthTransactionCount > 0;

  useEffect(() => {
    setActiveData(data);
  }, [data]);

  const selectInsightsView = (updates: InsightsSelectionUpdate) => {
    const href = buildInsightsHref(activeData, updates);
    const isChartOnlyUpdate = Boolean(updates.chart && !updates.currency && !updates.month && !updates.timeframe);

    if (isChartOnlyUpdate) {
      setActiveData((currentData) => ({
        ...currentData,
        selectedChartMode: updates.chart ?? currentData.selectedChartMode,
      }));

      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` !== href) {
        window.history.pushState(null, "", href);
      }

      return;
    }

    router.push(href, { scroll: false });
  };

  return (
    <section className="space-y-5">
      <ScreenHeader
        eyebrow={t("insights.title", locale)}
        title={t("insights.heroTitle", locale)}
        description={t("insights.trackedMoneyOnly", locale)}
      />
      <InsightsControlBar data={activeData} onSelect={selectInsightsView} />
      {loadError ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("insights.loadError.title", locale)}</CardTitle>
            <CardDescription>{t("insights.loadError.helper", locale)}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {!hasTrackedData ? (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>{t("insights.empty.title", locale)}</CardTitle>
            <CardDescription>
              {t("insights.empty.helper", locale)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <MonthlySnapshotCard data={activeData} />
      <CalmInsightCard data={activeData} />
      <TimeframeInsightsCard data={activeData} onSelect={selectInsightsView} />

      {activeData.hasMissingRates ? (
        <p className="text-xs leading-5 text-slate-500">
          {t("insights.converted.missingConvertedTotalsRate", locale)}
        </p>
      ) : null}

      {hasTrackedData && !hasCurrentMonthData ? (
        <div className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
          <p>
            {t("insights.empty.noTransactionsInMonth", locale).replace("{month}", activeData.monthLabel)}
          </p>
          {activeData.isSelectedMonthCurrent && activeData.hasHistoricalActivity && activeData.latestActivityMonth ? (
            <InsightsQueryButton
              className="inline-flex min-h-10 items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
              href={buildInsightsHref(activeData, { month: activeData.latestActivityMonth })}
              onSelect={() => selectInsightsView({ month: activeData.latestActivityMonth ?? undefined })}
            >
              {t("insights.empty.viewLatestMonth", locale)}
            </InsightsQueryButton>
          ) : null}
        </div>
      ) : null}

      <LargestEntriesCard data={activeData} />

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-lg">{t("insights.limits.title", locale)}</CardTitle>
          <CardDescription>{t("insights.limits.helper", locale)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeData.budgetProgress.length ? (
            activeData.budgetProgress.map((item) => (
              <div key={item.budgetId} className="space-y-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{getCategoryLabel(item.categoryLabel, locale)}</p>
                    <p className="text-xs text-slate-500">
                      {item.period === "weekly" ? t("assistant.limits.weekly", locale) : t("assistant.limits.monthly", locale)} · {item.spentDisplay} {t("insights.limits.of", locale)} {item.amountDisplay} {t("insights.bars.used", locale).toLowerCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${item.isOverBudget ? "text-rose-700" : "text-slate-800"}`}>
                      {item.isOverBudget ? `${item.remainingDisplay} ${t("insights.bars.over", locale)}` : `${item.remainingDisplay} ${t("activity.limit.left", locale)}`}
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${getLimitStatusColor(item.percentUsed)}`}
                    style={{ width: `${Math.min(item.percentUsed, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">{item.percentUsed}% {t("insights.bars.used", locale).toLowerCase()}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6 text-slate-500">{t("insights.limits.empty", locale)}</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
