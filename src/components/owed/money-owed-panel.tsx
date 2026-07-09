"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Calendar, Check, ChevronDown, CirclePlus, FileText } from "lucide-react";
import { CalmDatePicker } from "@/components/ui/calm-date-picker";
import { CompactCurrencyPicker } from "@/components/ui/compact-currency-picker";
import type { OwedNote, OwedNoteDirection } from "@/domain/owed-notes/types";
import { initialOwedNoteActionState, type OwedNoteActionState } from "@/lib/actions/owed-notes-state";
import { t, type SupportedLocale } from "@/lib/i18n";

type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;
type OwedSection = "owed_to_me" | "i_owe" | "create" | null;
type OwedEditor = { noteId: string; kind: "add" | "subtract" | "note" | "settle" } | null;
type CreateOptionalSection = "note" | "dueDate" | null;

type MoneyOwedPanelProps = {
  notes: OwedNote[];
  defaultCurrency: string;
  createAction: OwedNoteActionHandler;
  adjustAmountAction: OwedNoteActionHandler;
  updateNoteAction: OwedNoteActionHandler;
  settleAction: OwedNoteActionHandler;
  title?: string | null;
  summary?: boolean;
  variant?: "assistant" | "activity";
  locale?: SupportedLocale;
};

const currencyOptions = ["RON", "EUR", "USD", "GBP"] as const;
const currencyPickerOptions = [
  { code: "RON", helper: "lei" },
  { code: "EUR", helper: "€" },
  { code: "USD", helper: "$" },
  { code: "GBP", helper: "£" },
] as const;

function getIntlLocale(locale: SupportedLocale) {
  if (locale === "ro") {
    return "ro-RO";
  }

  if (locale === "fr") {
    return "fr-FR";
  }

  if (locale === "es") {
    return "es-ES";
  }

  return "en-US";
}

function formatOwedAmount(amount: number, currency: string, locale: SupportedLocale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatOwedDate(value: string, locale: SupportedLocale) {
  return new Date(value).toLocaleDateString(getIntlLocale(locale), { month: "short", day: "numeric" });
}

function getDirectionLabel(direction: OwedNoteDirection, locale: SupportedLocale = "en") {
  return direction === "owed_to_me" ? t("owed.owedToMe", locale) : t("owed.iOwe", locale);
}

function buildOwedSummary(notes: OwedNote[], locale: SupportedLocale) {
  const openNotes = notes.filter((note) => note.status === "open");

  if (!openNotes.length) {
    return t("owed.noOpenReminders", locale);
  }

  const currencies = new Set(openNotes.map((note) => note.currency));

  if (currencies.size > 1) {
    return t(openNotes.length === 1 ? "owed.openReminderCount" : "owed.openRemindersCount", locale, { count: openNotes.length });
  }

  const currency = openNotes[0]?.currency ?? "USD";
  const owedToMe = openNotes.filter((note) => note.direction === "owed_to_me").reduce((sum, note) => sum + note.currentAmount, 0);
  const iOwe = openNotes.filter((note) => note.direction === "i_owe").reduce((sum, note) => sum + note.currentAmount, 0);

  return t("owed.summary", locale, {
    owedToMe: formatOwedAmount(owedToMe, currency, locale),
    iOwe: formatOwedAmount(iOwe, currency, locale),
  });
}

function getEmptyOwedCopy(direction: OwedNoteDirection, locale: SupportedLocale) {
  return direction === "owed_to_me" ? t("owed.noOwedToMe", locale) : t("owed.noIOwe", locale);
}

function OwedOptionButton({
  expanded,
  helper,
  icon,
  onClick,
  title,
}: {
  expanded: boolean;
  helper: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-expanded={expanded}
      className={`grid w-full grid-cols-[2rem_1fr_auto] items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        expanded ? "border-sky-200 bg-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex size-8 items-center justify-center rounded-xl ${expanded ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-600"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block whitespace-nowrap text-xs leading-5 text-slate-500">{helper}</span>
      </span>
      <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} strokeWidth={2.2} />
    </button>
  );
}

export function MoneyOwedPanel({
  notes,
  defaultCurrency,
  createAction,
  adjustAmountAction,
  updateNoteAction,
  settleAction,
  title = "Money owed",
  summary = true,
  variant = "assistant",
  locale = "en",
}: MoneyOwedPanelProps) {
  const normalizedDefaultCurrency = currencyOptions.includes(defaultCurrency as (typeof currencyOptions)[number]) ? defaultCurrency : "USD";
  const [localNotes, setLocalNotes] = useState(notes);
  const [expandedSection, setExpandedSection] = useState<OwedSection>(null);
  const [editor, setEditor] = useState<OwedEditor>(null);
  const [activityExpandedNoteId, setActivityExpandedNoteId] = useState<string | null>(null);
  const [createDirection, setCreateDirection] = useState<OwedNoteDirection>("owed_to_me");
  const [createOptionalSection, setCreateOptionalSection] = useState<CreateOptionalSection>(null);
  const [createCurrency, setCreateCurrency] = useState(normalizedDefaultCurrency);
  const [createNote, setCreateNote] = useState("");
  const [createDueDate, setCreateDueDate] = useState("");
  const [createDueDateHasInvalidDraft, setCreateDueDateHasInvalidDraft] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const createNoteRef = useRef<HTMLTextAreaElement>(null);
  const [createState, createFormAction, isCreatePending] = useActionState(createAction, initialOwedNoteActionState);
  const [adjustState, adjustFormAction, isAdjustPending] = useActionState(adjustAmountAction, initialOwedNoteActionState);
  const [noteState, noteFormAction, isNotePending] = useActionState(updateNoteAction, initialOwedNoteActionState);
  const [settleState, settleFormAction, isSettlePending] = useActionState(settleAction, initialOwedNoteActionState);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    setCreateCurrency(normalizedDefaultCurrency);
  }, [normalizedDefaultCurrency]);

  useEffect(() => {
    if (createState.status === "success" && createState.note) {
      setLocalNotes((current) => [createState.note as OwedNote, ...current.filter((note) => note.id !== createState.note?.id)]);
      setExpandedSection(createState.note.direction);
      setActivityExpandedNoteId(createState.note.id);
      setCreateDirection(createState.note.direction);
      setCreateOptionalSection(null);
      setCreateNote("");
      setCreateDueDate("");
      setCreateDueDateHasInvalidDraft(false);
      setCreateCurrency(normalizedDefaultCurrency);
      setCreateFormKey((key) => key + 1);
    }
  }, [createState, normalizedDefaultCurrency]);

  useEffect(() => {
    if (createOptionalSection === "note") {
      createNoteRef.current?.focus();
    }

  }, [createOptionalSection]);

  useEffect(() => {
    const nextNote = adjustState.note ?? noteState.note;

    if (nextNote) {
      setLocalNotes((current) => current.map((note) => (note.id === nextNote.id ? nextNote : note)));
      setEditor(null);
    }
  }, [adjustState.note, noteState.note]);

  useEffect(() => {
    if (settleState.status === "success" && settleState.note) {
      setLocalNotes((current) => current.filter((note) => note.id !== settleState.note?.id));
      setEditor(null);
      setActivityExpandedNoteId(null);
    }
  }, [settleState]);

  const openNotes = useMemo(() => localNotes.filter((note) => note.status === "open"), [localNotes]);
  const owedToMeNotes = openNotes.filter((note) => note.direction === "owed_to_me");
  const iOweNotes = openNotes.filter((note) => note.direction === "i_owe");
  const latestMessage = [createState, adjustState, noteState, settleState].find((state) => state.status !== "idle" && state.message)?.message ?? null;
  const latestStatus = [createState, adjustState, noteState, settleState].find((state) => state.status !== "idle" && state.message)?.status ?? "idle";

  function toggleSection(section: Exclude<OwedSection, null>) {
    setExpandedSection((current) => (current === section ? null : section));
    setEditor(null);
  }

  function renderNoteRows(direction: OwedNoteDirection, items: OwedNote[]) {
    if (!items.length) {
      return <p className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">{getEmptyOwedCopy(direction, locale)}</p>;
    }

    return (
      <div className="space-y-2">
        {items.map((note) => {
          const isEditorOpen = editor?.noteId === note.id;
          return (
            <div className="space-y-2 rounded-2xl bg-white px-3 py-3" key={note.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{note.personName}</p>
                  <p className="text-xs text-slate-500">
                    {note.note ? `${note.note} · ` : ""}
                    {t("owed.updated", locale)} {formatOwedDate(note.updatedAt, locale)}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${direction === "owed_to_me" ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatOwedAmount(note.currentAmount, note.currency, locale)}
                </p>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["add", "subtract", "note", "settle"] as const).map((kind) => (
                  <button
                    className="rounded-lg bg-slate-50 px-1.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    key={kind}
                    onClick={() => setEditor((current) => (current?.noteId === note.id && current.kind === kind ? null : { noteId: note.id, kind }))}
                    type="button"
                  >
                    {kind === "add"
                      ? t("common.add", locale)
                      : kind === "subtract"
                        ? t("owed.subtract", locale)
                        : kind === "note"
                          ? t("common.note", locale)
                          : t("owed.settle", locale)}
                  </button>
                ))}
              </div>
              {isEditorOpen && editor.kind !== "settle" ? (
                <form action={editor.kind === "note" ? noteFormAction : adjustFormAction} className="grid gap-2 rounded-xl bg-slate-50 p-2">
                  <input name="owedNoteId" type="hidden" value={note.id} />
                  {editor.kind === "note" ? (
                    <textarea
                      className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      defaultValue={note.note ?? ""}
                      name="note"
                      placeholder={t("owed.addNote", locale)}
                    />
                  ) : (
                    <>
                      <input name="operation" type="hidden" value={editor.kind} />
                      <input
                        className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        inputMode="decimal"
                        min="0.01"
                        name="amount"
                        placeholder={t("common.amount", locale)}
                        required
                        step="0.01"
                        type="number"
                      />
                    </>
                  )}
                  <button
                    className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={editor.kind === "note" ? isNotePending : isAdjustPending}
                    type="submit"
                  >
                    {editor.kind === "note"
                      ? t("owed.saveNote", locale)
                      : editor.kind === "add"
                        ? t("owed.addAmount", locale)
                        : t("owed.subtractAmount", locale)}
                  </button>
                </form>
              ) : null}
              {isEditorOpen && editor.kind === "settle" ? (
                <form action={settleFormAction} className="grid gap-2 rounded-xl bg-slate-50 p-2">
                  <input name="owedNoteId" type="hidden" value={note.id} />
                  <p className="text-sm font-medium text-slate-800">{t("owed.markSettledQuestion", locale)}</p>
                  <button
                    className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={isSettlePending}
                    type="submit"
                  >
                    {t("owed.markSettled", locale)}
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderActivityNoteRows(direction: OwedNoteDirection, items: OwedNote[]) {
    if (!items.length) {
      return <p className="rounded-xl bg-white px-3 py-2 text-xs text-slate-500">{t("owed.noOpenReminders", locale)}</p>;
    }

    return (
      <div className="space-y-1.5">
        {items.map((note) => {
          const isExpanded = activityExpandedNoteId === note.id;
          const isEditorOpen = isExpanded && editor?.noteId === note.id;
          const preview = note.note ? note.note : `${t("owed.updated", locale)} ${formatOwedDate(note.updatedAt, locale)}`;

          return (
            <div className="rounded-xl bg-white ring-1 ring-slate-100" key={note.id}>
              <button
                aria-expanded={isExpanded}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                onClick={() => {
                  setActivityExpandedNoteId((current) => (current === note.id ? null : note.id));
                  setEditor(null);
                }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{note.personName}</span>
                  <span className="block truncate text-xs leading-5 text-slate-500">
                    {getDirectionLabel(direction, locale)} - {preview}
                  </span>
                </span>
                <span className={`text-sm font-semibold ${direction === "owed_to_me" ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatOwedAmount(note.currentAmount, note.currency, locale)}
                </span>
              </button>
              {isExpanded ? (
                <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["add", "subtract", "note", "settle"] as const).map((kind) => (
                      <button
                        className={`rounded-lg px-1.5 py-2 text-xs font-medium transition ${
                          editor?.noteId === note.id && editor.kind === kind ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                        key={kind}
                        onClick={() => setEditor((current) => (current?.noteId === note.id && current.kind === kind ? null : { noteId: note.id, kind }))}
                        type="button"
                      >
                        {kind === "add"
                          ? t("common.add", locale)
                          : kind === "subtract"
                            ? t("owed.subtract", locale)
                            : kind === "note"
                              ? t("common.note", locale)
                              : t("owed.settle", locale)}
                      </button>
                    ))}
                  </div>
                  {isEditorOpen && editor.kind !== "settle" ? (
                    <form action={editor.kind === "note" ? noteFormAction : adjustFormAction} className="grid gap-2 rounded-xl bg-slate-50 p-2">
                      <input name="owedNoteId" type="hidden" value={note.id} />
                      {editor.kind === "note" ? (
                        <textarea
                          className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                          defaultValue={note.note ?? ""}
                          name="note"
                          placeholder={t("owed.addNote", locale)}
                        />
                      ) : (
                        <>
                          <input name="operation" type="hidden" value={editor.kind} />
                          <input
                            className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                            inputMode="decimal"
                            min="0.01"
                            name="amount"
                            placeholder={t("common.amount", locale)}
                            required
                            step="0.01"
                            type="number"
                          />
                        </>
                      )}
                      <button
                        className="min-h-10 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={editor.kind === "note" ? isNotePending : isAdjustPending}
                        type="submit"
                      >
                        {editor.kind === "note"
                          ? t("owed.saveNote", locale)
                          : editor.kind === "add"
                            ? t("owed.addAmount", locale)
                            : t("owed.subtractAmount", locale)}
                      </button>
                    </form>
                  ) : null}
                  {isEditorOpen && editor.kind === "settle" ? (
                    <form action={settleFormAction} className="grid gap-2 rounded-xl bg-slate-50 p-2">
                      <input name="owedNoteId" type="hidden" value={note.id} />
                      <p className="text-sm font-medium text-slate-800">{t("owed.markSettledQuestion", locale)}</p>
                      <button
                        className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                        disabled={isSettlePending}
                        type="submit"
                      >
                        {t("owed.markSettled", locale)}
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function renderCreateForm(className = "space-y-3 rounded-2xl bg-white p-3") {
    const noteAdded = createNote.trim().length > 0;
    const dueDateAdded = createDueDate.trim().length > 0;

    return (
      <form action={createFormAction} className={className} key={createFormKey}>
        <input name="direction" type="hidden" value={createDirection} />
        <input name="note" type="hidden" value={createNote} />
        <input name="dueDate" type="hidden" value={createDueDate} />
        {variant === "assistant" ? <input name="currency" type="hidden" value={createCurrency} /> : null}
        <div className="grid grid-cols-2 gap-2">
          {(["owed_to_me", "i_owe"] as const).map((direction) => (
            <button
              aria-pressed={createDirection === direction}
              className={`flex min-h-10 items-center justify-center rounded-xl px-2 text-sm font-semibold transition ${
                createDirection === direction ? "bg-sky-600 text-white shadow-sm" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              key={direction}
              onClick={() => setCreateDirection(direction)}
              type="button"
            >
              {getDirectionLabel(direction, locale)}
            </button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">{t("common.person", locale)}</span>
          <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" name="personName" placeholder={t("common.name", locale)} required />
        </label>
        <div className={variant === "assistant" ? "grid grid-cols-[minmax(0,1fr)_5.75rem] gap-2" : "grid gap-2"}>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">{t("common.amount", locale)}</span>
            <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" inputMode="decimal" min="0.01" name="amount" required step="0.01" type="number" />
          </label>
          {variant === "assistant" ? (
            <CompactCurrencyPicker
              label={t("common.currency", locale)}
              onChange={(currency) => setCreateCurrency(currency as (typeof currencyOptions)[number])}
              options={currencyPickerOptions}
              value={createCurrency}
            />
          ) : (
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">{t("common.currency", locale)}</span>
              <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold" defaultValue={normalizedDefaultCurrency} name="currency">
                {currencyOptions.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            aria-expanded={createOptionalSection === "note"}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition ${
              createOptionalSection === "note"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : noteAdded
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setCreateOptionalSection((current) => (current === "note" ? null : "note"))}
            type="button"
          >
            {noteAdded && createOptionalSection !== "note" ? <Check aria-hidden="true" className="size-3.5" /> : <FileText aria-hidden="true" className="size-3.5" />}
            <span className="truncate">{noteAdded && createOptionalSection !== "note" ? t("owed.noteAdded", locale) : t("common.note", locale)}</span>
          </button>
          <button
            aria-expanded={createOptionalSection === "dueDate"}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-semibold transition ${
              createOptionalSection === "dueDate"
                ? "border-sky-200 bg-sky-50 text-sky-700"
                : dueDateAdded
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setCreateOptionalSection((current) => (current === "dueDate" ? null : "dueDate"))}
            type="button"
          >
            {dueDateAdded && createOptionalSection !== "dueDate" ? <Check aria-hidden="true" className="size-3.5" /> : <Calendar aria-hidden="true" className="size-3.5" />}
            <span className="truncate">{dueDateAdded && createOptionalSection !== "dueDate" ? formatOwedDate(`${createDueDate}T00:00:00.000Z`, locale) : t("owed.dueDateShort", locale)}</span>
          </button>
        </div>
        {createOptionalSection === "note" ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-slate-600">{t("common.note", locale)}</span>
            <textarea
              className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              onChange={(event) => setCreateNote(event.target.value)}
              placeholder={t("common.optional", locale)}
              ref={createNoteRef}
              value={createNote}
            />
          </label>
        ) : null}
        {createOptionalSection === "dueDate" ? (
          <div className="space-y-2">
            <CalmDatePicker label={t("common.dueDate", locale)} onDraftValidityChange={setCreateDueDateHasInvalidDraft} selectedDate={createDueDate} onSelect={setCreateDueDate} />
          </div>
        ) : null}
        <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isCreatePending || createDueDateHasInvalidDraft} type="submit">
          <Check aria-hidden="true" className="size-4" />
          {t("common.save", locale)}
        </button>
      </form>
    );
  }

  const shouldShowSummary = summary && (variant !== "activity" || openNotes.length > 0);
  const panelHeader =
    title || shouldShowSummary ? (
      <div className="space-y-1">
        {title ? <p className="text-sm font-semibold text-slate-900">{title}</p> : null}
        {shouldShowSummary ? <p className="text-xs leading-5 text-slate-500">{buildOwedSummary(openNotes, locale)}</p> : null}
      </div>
    ) : null;

  if (variant === "activity") {
    const hasOpenNotes = openNotes.length > 0;

    return (
      <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
        {panelHeader}
        {!hasOpenNotes ? <p className="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">{t("owed.noOpenReminders", locale)}</p> : null}
        {hasOpenNotes ? (
          <div className="space-y-3">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ArrowDownLeft aria-hidden="true" className="size-4 text-emerald-700" strokeWidth={2.2} />
                {t("owed.owedToMe", locale)}
              </div>
              {renderActivityNoteRows("owed_to_me", owedToMeNotes)}
            </section>
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ArrowUpRight aria-hidden="true" className="size-4 text-amber-700" strokeWidth={2.2} />
                {t("owed.iOwe", locale)}
              </div>
              {renderActivityNoteRows("i_owe", iOweNotes)}
            </section>
          </div>
        ) : null}
        <button
          aria-expanded={expandedSection === "create"}
          className="flex min-h-10 w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 ring-1 ring-slate-100 transition hover:bg-slate-50"
          onClick={() => toggleSection("create")}
          type="button"
        >
          <span className="flex items-center gap-2">
            <CirclePlus aria-hidden="true" className="size-4 text-sky-700" strokeWidth={2.2} />
            {t("owed.createOwedNote", locale)}
          </span>
          <ChevronDown aria-hidden="true" className={`size-4 text-slate-400 transition-transform ${expandedSection === "create" ? "rotate-180" : ""}`} strokeWidth={2.2} />
        </button>
        {expandedSection === "create" ? renderCreateForm("space-y-3 rounded-xl bg-white p-3 ring-1 ring-slate-100") : null}
        {latestMessage ? (
          <p className={`rounded-xl px-3 py-2 text-sm ${latestStatus === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            {latestMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
      {panelHeader}
      <div className="space-y-2">
        <OwedOptionButton
          expanded={expandedSection === "owed_to_me"}
          helper={t("assistant.owed.owedToMeHelper", locale)}
          icon={<ArrowDownLeft aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("owed_to_me")}
          title={t("owed.owedToMe", locale)}
        />
        {expandedSection === "owed_to_me" ? renderNoteRows("owed_to_me", owedToMeNotes) : null}
        <OwedOptionButton
          expanded={expandedSection === "i_owe"}
          helper={t("assistant.owed.iOweHelper", locale)}
          icon={<ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("i_owe")}
          title={t("owed.iOwe", locale)}
        />
        {expandedSection === "i_owe" ? renderNoteRows("i_owe", iOweNotes) : null}
        <OwedOptionButton
          expanded={expandedSection === "create"}
          helper={t("assistant.owed.createNoteHelper", locale)}
          icon={<CirclePlus aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("create")}
          title={t("owed.createOwedNote", locale)}
        />
        {expandedSection === "create" ? renderCreateForm() : null}
      </div>
      {latestMessage ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${latestStatus === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {latestMessage}
        </p>
      ) : null}
    </div>
  );
}
