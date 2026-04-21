"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { AssistantActionState } from "@/lib/server/assistant";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
};

export function AssistantComposer({ action, initialState }: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);

  return (
    <div className="space-y-4">
      {state.message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            state.status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          <p className="font-medium">{state.message}</p>
          {state.latestTransaction ? (
            <p className="mt-1 text-xs text-slate-600">
              Latest item: {state.latestTransaction.merchant || "Unnamed transaction"} saved with {state.latestTransaction.reviewState}.
            </p>
          ) : null}
        </div>
      ) : null}

      <form action={formAction} className="space-y-3">
        <input name="toolName" type="hidden" value="create_transaction" />
        <input name="currency" type="hidden" value="USD" />

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Intent</span>
            <select
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
              defaultValue="expense"
              name="transactionType"
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Amount</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
              inputMode="decimal"
              name="amount"
              placeholder="24.50"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Merchant</span>
          <input
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="merchant"
            placeholder="Optional merchant"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Note</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="note"
            placeholder="Optional note"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save item"}
          </Button>
          <button
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            disabled={isPending}
            formAction={formAction}
            name="toolName"
            type="submit"
            value="list_transactions"
          >
            Show recent
          </button>
        </div>
      </form>

      {state.recentItems.length ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Latest results</p>
          {state.recentItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500">{item.subtitle}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800">{item.amountDisplay}</p>
                {item.needsReview ? <p className="text-xs text-amber-600">Needs review</p> : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
