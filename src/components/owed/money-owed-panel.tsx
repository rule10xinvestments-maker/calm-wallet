"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, HandCoins, Minus, Plus } from "lucide-react";
import type { OwedNote, OwedNoteDirection } from "@/domain/owed-notes/types";
import { initialOwedNoteActionState, type OwedNoteActionState } from "@/lib/actions/owed-notes-state";

type OwedNoteActionHandler = (state: OwedNoteActionState, formData: FormData) => Promise<OwedNoteActionState>;
type OwedSection = "owed_to_me" | "i_owe" | "create" | null;
type OwedEditor = { noteId: string; kind: "add" | "subtract" | "note" | "settle" } | null;

type MoneyOwedPanelProps = {
  notes: OwedNote[];
  defaultCurrency: string;
  createAction: OwedNoteActionHandler;
  adjustAmountAction: OwedNoteActionHandler;
  updateNoteAction: OwedNoteActionHandler;
  settleAction: OwedNoteActionHandler;
  title?: string;
  summary?: boolean;
};

const currencyOptions = ["RON", "EUR", "USD", "GBP"] as const;

function formatOwedAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatOwedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDirectionLabel(direction: OwedNoteDirection) {
  return direction === "owed_to_me" ? "Owed to me" : "I owe";
}

function buildOwedSummary(notes: OwedNote[]) {
  const openNotes = notes.filter((note) => note.status === "open");

  if (!openNotes.length) {
    return "No open money reminders.";
  }

  const currencies = new Set(openNotes.map((note) => note.currency));

  if (currencies.size > 1) {
    return `${openNotes.length} open money ${openNotes.length === 1 ? "reminder" : "reminders"}`;
  }

  const currency = openNotes[0]?.currency ?? "USD";
  const owedToMe = openNotes.filter((note) => note.direction === "owed_to_me").reduce((sum, note) => sum + note.currentAmount, 0);
  const iOwe = openNotes.filter((note) => note.direction === "i_owe").reduce((sum, note) => sum + note.currentAmount, 0);

  return `${formatOwedAmount(owedToMe, currency)} owed to you · ${formatOwedAmount(iOwe, currency)} you owe`;
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
      className={`grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
        expanded ? "border-sky-200 bg-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className={`flex size-9 items-center justify-center rounded-xl ${expanded ? "bg-sky-50 text-sky-700" : "bg-slate-50 text-slate-600"}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        <span className="block text-xs leading-5 text-slate-500">{helper}</span>
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
}: MoneyOwedPanelProps) {
  const [localNotes, setLocalNotes] = useState(notes);
  const [expandedSection, setExpandedSection] = useState<OwedSection>(null);
  const [editor, setEditor] = useState<OwedEditor>(null);
  const [createDirection, setCreateDirection] = useState<OwedNoteDirection>("owed_to_me");
  const [createState, createFormAction, isCreatePending] = useActionState(createAction, initialOwedNoteActionState);
  const [adjustState, adjustFormAction, isAdjustPending] = useActionState(adjustAmountAction, initialOwedNoteActionState);
  const [noteState, noteFormAction, isNotePending] = useActionState(updateNoteAction, initialOwedNoteActionState);
  const [settleState, settleFormAction, isSettlePending] = useActionState(settleAction, initialOwedNoteActionState);
  const normalizedDefaultCurrency = currencyOptions.includes(defaultCurrency as (typeof currencyOptions)[number]) ? defaultCurrency : "USD";

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (createState.status === "success" && createState.note) {
      setLocalNotes((current) => [createState.note as OwedNote, ...current.filter((note) => note.id !== createState.note?.id)]);
      setExpandedSection(createState.note.direction);
    }
  }, [createState]);

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
      return <p className="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">No open money reminders.</p>;
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
                    Updated {formatOwedDate(note.updatedAt)}
                  </p>
                </div>
                <p className={`shrink-0 text-sm font-semibold ${direction === "owed_to_me" ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatOwedAmount(note.currentAmount, note.currency)}
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
                    {kind === "add" ? "Add" : kind === "subtract" ? "Subtract" : kind === "note" ? "Note" : "Settle"}
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
                      placeholder="Add a note"
                    />
                  ) : (
                    <>
                      <input name="operation" type="hidden" value={editor.kind} />
                      <input
                        className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                        inputMode="decimal"
                        min="0.01"
                        name="amount"
                        placeholder="Amount"
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
                    {editor.kind === "note" ? "Save note" : editor.kind === "add" ? "Add amount" : "Subtract amount"}
                  </button>
                </form>
              ) : null}
              {isEditorOpen && editor.kind === "settle" ? (
                <form action={settleFormAction} className="grid gap-2 rounded-xl bg-slate-50 p-2">
                  <input name="owedNoteId" type="hidden" value={note.id} />
                  <p className="text-sm font-medium text-slate-800">Mark this as settled?</p>
                  <button
                    className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={isSettlePending}
                    type="submit"
                  >
                    Mark settled
                  </button>
                </form>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        {summary ? <p className="text-xs leading-5 text-slate-500">{buildOwedSummary(openNotes)}</p> : null}
      </div>
      <div className="space-y-2">
        <OwedOptionButton
          expanded={expandedSection === "owed_to_me"}
          helper="Money others should pay back."
          icon={<HandCoins aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("owed_to_me")}
          title="Owed to me"
        />
        {expandedSection === "owed_to_me" ? renderNoteRows("owed_to_me", owedToMeNotes) : null}
        <OwedOptionButton
          expanded={expandedSection === "i_owe"}
          helper="Money I need to pay."
          icon={<Minus aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("i_owe")}
          title="I owe"
        />
        {expandedSection === "i_owe" ? renderNoteRows("i_owe", iOweNotes) : null}
        <OwedOptionButton
          expanded={expandedSection === "create"}
          helper="Add a money reminder."
          icon={<Plus aria-hidden="true" className="size-4" strokeWidth={2.2} />}
          onClick={() => toggleSection("create")}
          title="Create owed note"
        />
        {expandedSection === "create" ? (
          <form action={createFormAction} className="space-y-3 rounded-2xl bg-white p-3">
            <input name="direction" type="hidden" value={createDirection} />
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
                  {getDirectionLabel(direction)}
                </button>
              ))}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Person</span>
              <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" name="personName" placeholder="Name" required />
            </label>
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Amount</span>
                <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" inputMode="decimal" min="0.01" name="amount" required step="0.01" type="number" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-slate-600">Currency</span>
                <select className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm font-semibold" defaultValue={normalizedDefaultCurrency} name="currency">
                  {currencyOptions.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Note</span>
              <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" name="note" placeholder="Optional" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">Due date</span>
              <input className="min-h-10 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" name="dueDate" type="date" />
            </label>
            <button className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={isCreatePending} type="submit">
              <Check aria-hidden="true" className="size-4" />
              Save
            </button>
          </form>
        ) : null}
      </div>
      {latestMessage ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${latestStatus === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
          {latestMessage}
        </p>
      ) : null}
    </div>
  );
}
