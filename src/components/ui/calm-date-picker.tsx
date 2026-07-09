"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

type CalmDatePickerProps = {
  selectedDate: string;
  onSelect: (dateKey: string) => void;
};

function toLocalDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getDateMonth(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return { year: date.getFullYear(), monthIndex: date.getMonth() };
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

export function CalmDatePicker({ selectedDate, onSelect }: CalmDatePickerProps) {
  const { locale } = useLocale();
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
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(new Date(calendarMonth.year, calendarMonth.monthIndex, 1)),
    [locale, calendarMonth],
  );
  const todayKey = toLocalDateKey(new Date());

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

  return (
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
        {["S", "M", "T", "W", "T", "F", "S"].map((weekday, index) => (
          <span key={`${weekday}-${index}`}>{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (!day) {
            return <span aria-hidden="true" key={`empty-date-${index}`} />;
          }

          const isSelected = selectedDate === day.dateKey;
          const isToday = todayKey === day.dateKey;

          return (
            <button
              aria-label={day.dateKey}
              aria-pressed={isSelected}
              className={`min-h-8 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? "bg-sky-600 text-white shadow-sm"
                  : isToday
                    ? "bg-white text-sky-800 ring-1 ring-sky-200"
                    : "bg-white text-slate-700 hover:bg-sky-50"
              }`}
              key={day.dateKey}
              onClick={() => onSelect(day.dateKey)}
              type="button"
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
