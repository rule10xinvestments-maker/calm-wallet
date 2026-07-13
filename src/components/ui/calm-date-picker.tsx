"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatDateKey, formatDisplayDate } from "@/lib/display-formatting";
import { t } from "@/lib/i18n";

type CalmDatePickerProps = {
  disabled?: boolean;
  invalidMessage?: string;
  label: string;
  onDraftValidityChange?: (hasInvalidDraft: boolean) => void;
  selectedDate: string;
  onSelect: (dateKey: string) => void;
};

function toLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getDateMonth(value: string) {
  const validDate = getValidDateKey(value);

  if (!validDate) {
    return null;
  }

  const date = new Date(`${validDate}T12:00:00`);

  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

function formatDateDigits(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  return [year, month, day].filter(Boolean).join("-");
}

function getValidDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return `${yearValue}-${monthValue}-${dayValue}`;
}

function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();
  const days: Array<{ dateKey: string; day: number } | null> = Array.from({ length: leadingEmptyDays }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    days.push({ dateKey: toLocalDateKey(date), day });
  }

  return days;
}

export function CalmDatePicker({ disabled = false, invalidMessage, label, onDraftValidityChange, selectedDate, onSelect }: CalmDatePickerProps) {
  const { locale } = useLocale();
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [hasInvalidDraft, setHasInvalidDraft] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const selectedMonth = getDateMonth(selectedDate);

    if (selectedMonth) {
      return selectedMonth;
    }

    const today = new Date();
    return { year: today.getFullYear(), monthIndex: today.getMonth() };
  });
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth.year, calendarMonth.monthIndex), [calendarMonth]);
  const monthLabel = useMemo(
    () =>
      formatDisplayDate(new Date(calendarMonth.year, calendarMonth.monthIndex, 1), locale, {
        month: "long",
        year: "numeric",
      }),
    [locale, calendarMonth],
  );
  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(Date.UTC(2026, 6, 5 + index))),
      ),
    [locale],
  );
  const todayKey = toLocalDateKey(new Date());

  useEffect(() => {
    setDraftDate(selectedDate);
    setHasInvalidDraft(false);
    onDraftValidityChange?.(false);

    const selectedMonth = getDateMonth(selectedDate);

    if (selectedMonth) {
      setCalendarMonth(selectedMonth);
    }
  }, [onDraftValidityChange, selectedDate]);

  function setInvalidDraft(nextHasInvalidDraft: boolean) {
    setHasInvalidDraft(nextHasInvalidDraft);
    onDraftValidityChange?.(nextHasInvalidDraft);
  }

  function showPreviousMonth() {
    setCalendarMonth((current) => {
      const date = new Date(current.year, current.monthIndex - 1, 1);
      return { year: date.getFullYear(), monthIndex: date.getMonth() };
    });
  }

  function showNextMonth() {
    setCalendarMonth((current) => {
      const date = new Date(current.year, current.monthIndex + 1, 1);
      return { year: date.getFullYear(), monthIndex: date.getMonth() };
    });
  }

  function handleTypedDate(value: string) {
    const formattedValue = formatDateDigits(value);
    setDraftDate(formattedValue);

    if (!formattedValue) {
      onSelect("");
      setInvalidDraft(false);
      return;
    }

    const validDateKey = getValidDateKey(formattedValue);

    if (validDateKey) {
      const selectedMonth = getDateMonth(validDateKey);

      if (selectedMonth) {
        setCalendarMonth(selectedMonth);
      }

      onSelect(validDateKey);
      setInvalidDraft(false);
      return;
    }

    setInvalidDraft(true);
  }

  function selectCalendarDate(dateKey: string) {
    setDraftDate(dateKey);
    setInvalidDraft(false);
    onSelect(dateKey);
  }

  return (
    <div className="space-y-2">
      <label className="block space-y-1 rounded-xl border border-slate-200 bg-white p-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input
          aria-invalid={hasInvalidDraft}
          className={`min-h-10 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 ${
            hasInvalidDraft ? "border-rose-200 focus:border-rose-300 focus:ring-rose-100" : "border-slate-200 focus:border-sky-300 focus:ring-sky-100"
          }`}
          disabled={disabled}
          inputMode="numeric"
          onChange={(event) => handleTypedDate(event.target.value)}
          placeholder="YYYY-MM-DD"
          type="text"
          value={draftDate}
        />
        {hasInvalidDraft ? <span className="block text-xs font-medium text-rose-600">{invalidMessage ?? t("activity.time.enterValidDate", locale)}</span> : null}
      </label>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          aria-label={t("activity.time.previousMonth", locale)}
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
          onClick={showPreviousMonth}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
        <p className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</p>
        <button
          aria-label={t("activity.time.nextMonth", locale)}
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white hover:text-slate-900"
          onClick={showNextMonth}
          type="button"
        >
          <ChevronRight aria-hidden="true" size={16} strokeWidth={2.2} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
        {weekdayLabels.map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <span aria-hidden="true" key={`empty-date-${index}`} />;
          }

          const isSelected = !hasInvalidDraft && selectedDate === day.dateKey;
          const isToday = todayKey === day.dateKey;

          return (
            <button
              aria-label={formatDateKey(day.dateKey, locale, { dateStyle: "long" }) ?? day.dateKey}
              aria-pressed={isSelected}
              className={`min-h-8 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? "bg-sky-600 text-white shadow-sm"
                  : isToday
                    ? "bg-white text-sky-800 ring-1 ring-sky-200"
                    : "bg-white text-slate-700 hover:bg-sky-50"
              }`}
              key={day.dateKey}
              onClick={() => selectCalendarDate(day.dateKey)}
              type="button"
            >
              {day.day}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}
