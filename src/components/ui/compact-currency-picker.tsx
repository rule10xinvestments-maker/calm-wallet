"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

type CompactCurrencyPickerOption = {
  code: string;
  helper?: string;
};

type CompactCurrencyPickerProps = {
  label: string;
  options: readonly CompactCurrencyPickerOption[];
  onChange: (value: string) => void;
  value: string;
};

export function CompactCurrencyPicker({ label, onChange, options, value }: CompactCurrencyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"up" | "down">("down");
  const triggerRef = useRef<HTMLButtonElement>(null);

  function getPlacement() {
    if (typeof window === "undefined") {
      return "down";
    }

    const triggerRect = triggerRef.current?.getBoundingClientRect();

    if (!triggerRect) {
      return "down";
    }

    const pickerHeight = 116;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    return spaceBelow < pickerHeight && spaceAbove > spaceBelow ? "up" : "down";
  }

  function togglePicker() {
    setPlacement(getPlacement());
    setIsOpen((current) => !current);
  }

  function selectCurrency(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="relative block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <button
        aria-expanded={isOpen}
        aria-label={`${label}: ${value}`}
        className="flex min-h-11 w-full items-center justify-between gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-semibold uppercase text-slate-900 outline-none transition hover:bg-white focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        onClick={togglePicker}
        ref={triggerRef}
        type="button"
      >
        <span>{value}</span>
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={2.2} />
      </button>
      {isOpen ? (
        <div
          aria-label={`${label} options`}
          className={`absolute right-0 z-20 grid w-40 grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl ring-1 ring-slate-900/5 ${
            placement === "up" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          role="group"
        >
          {options.map((option) => (
            <button
              aria-pressed={value === option.code}
              className={`min-h-11 rounded-xl px-2 py-1.5 text-center transition ${
                value === option.code ? "bg-sky-600 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              key={option.code}
              onClick={() => selectCurrency(option.code)}
              type="button"
            >
              <span className="block text-sm font-bold leading-4">{option.code}</span>
              {option.helper ? (
                <span aria-hidden="true" className={`block text-[11px] leading-4 ${value === option.code ? "text-sky-50" : "text-slate-500"}`}>
                  {option.helper}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
