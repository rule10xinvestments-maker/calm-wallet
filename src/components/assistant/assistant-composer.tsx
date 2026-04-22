"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AssistantActionState } from "@/lib/server/assistant";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
};

export function AssistantComposer({ action, initialState }: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [selectedAction, setSelectedAction] = useState<
    "create_transaction" | "update_transaction" | "delete_transaction" | "recategorize_transaction" | "summarize_spending"
  >("create_transaction");

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
        <input name="toolName" type="hidden" value={selectedAction} />
        <input name="currency" type="hidden" value="USD" />

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Action</span>
          <select
            aria-label="Action"
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
            name="assistantActionSelection"
            onChange={(event) => setSelectedAction(event.target.value as typeof selectedAction)}
            value={selectedAction}
          >
            <option value="create_transaction">Create transaction</option>
            <option value="update_transaction">Update transaction</option>
            <option value="delete_transaction">Delete transaction</option>
            <option value="recategorize_transaction">Recategorize transaction</option>
            <option value="summarize_spending">Summarize spending</option>
          </select>
        </label>

        {selectedAction === "create_transaction" ? (
          <>
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
          </>
        ) : null}

        {selectedAction === "update_transaction" ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Transaction ID</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="transactionId"
                placeholder="Required transaction id"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Amount</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  inputMode="decimal"
                  name="amount"
                  placeholder="Optional amount"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Occurred date</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredAt"
                  type="date"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Category ID</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="categoryId"
                placeholder="Optional category id"
              />
            </label>
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
          </>
        ) : null}

        {selectedAction === "delete_transaction" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Transaction ID</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
              name="transactionId"
              placeholder="Required transaction id"
            />
          </label>
        ) : null}

        {selectedAction === "recategorize_transaction" ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Transaction ID</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="transactionId"
                placeholder="Required transaction id"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Category ID</span>
              <input
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                name="categoryId"
                placeholder="Leave blank to uncategorize"
              />
            </label>
          </>
        ) : null}

        {selectedAction === "summarize_spending" ? (
          <>
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
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">From</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredFrom"
                  type="date"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">To</span>
                <input
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                  name="occurredTo"
                  type="date"
                />
              </label>
            </div>
          </>
        ) : null}

        <Button className="w-full" disabled={isPending} type="submit">
          {isPending
            ? "Working..."
            : selectedAction === "create_transaction"
              ? "Save item"
              : selectedAction === "update_transaction"
                ? "Update item"
                : selectedAction === "delete_transaction"
                  ? "Delete item"
                  : selectedAction === "recategorize_transaction"
                    ? "Update category"
                    : "Run summary"}
        </Button>
      </form>

      <form action={formAction}>
        <input name="toolName" type="hidden" value="list_transactions" />
        <button
          className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          disabled={isPending}
          type="submit"
        >
          Show recent
        </button>
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
