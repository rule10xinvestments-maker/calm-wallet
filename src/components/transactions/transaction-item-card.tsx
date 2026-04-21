"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TransactionCategoryOption, TransactionListItem } from "@/lib/server/transactions-read-model";
import type { TransactionMutationState } from "@/lib/server/transaction-mutations";

type TransactionActionHandler = (state: TransactionMutationState, formData: FormData) => Promise<TransactionMutationState>;

type TransactionItemCardProps = {
  item: TransactionListItem;
  categories: TransactionCategoryOption[];
  recategorizeAction: TransactionActionHandler;
  updateAction: TransactionActionHandler;
  deleteAction: TransactionActionHandler;
  initialState: TransactionMutationState;
};

function ActionMessage({ state }: { state: TransactionMutationState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <p className={`text-xs ${state.status === "error" ? "text-rose-600" : "text-sky-700"}`}>
      {state.message}
    </p>
  );
}

export function TransactionItemCard({
  item,
  categories,
  recategorizeAction,
  updateAction,
  deleteAction,
  initialState,
}: TransactionItemCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [recategorizeState, recategorizeFormAction] = useActionState(recategorizeAction, initialState);
  const [updateState, updateFormAction] = useActionState(updateAction, initialState);
  const [deleteState, deleteFormAction] = useActionState(deleteAction, initialState);

  useEffect(() => {
    if (recategorizeState.status === "success" || updateState.status === "success" || deleteState.status === "success") {
      router.refresh();
    }
  }, [deleteState.status, recategorizeState.status, router, updateState.status]);

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900">{item.title}</p>
          <p className="text-sm text-slate-500">
            {item.categoryLabel} · {item.subtitle}
          </p>
          {item.reviewLabel !== "Tracked" ? <p className="text-xs text-amber-600">{item.reviewLabel}</p> : null}
        </div>
        <p className={`text-sm font-semibold ${item.amountTone === "income" ? "text-emerald-700" : "text-slate-700"}`}>
          {item.amountDisplay}
        </p>
      </div>

      <div className="mt-3 grid gap-3">
        <form action={recategorizeFormAction} className="flex gap-2">
          <input name="transactionId" type="hidden" value={item.id} />
          <select
            className="min-h-10 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            defaultValue={item.categoryId ?? ""}
            name="categoryId"
          >
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" type="submit">
            Save
          </button>
        </form>
        <ActionMessage state={recategorizeState} />

        <div className="flex gap-2">
          <button
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            onClick={() => setIsEditing((value) => !value)}
            type="button"
          >
            {isEditing ? "Close edit" : "Edit"}
          </button>

          {item.reviewState !== "reviewed" ? (
            <form action={updateFormAction}>
              <input name="transactionId" type="hidden" value={item.id} />
              <input name="merchant" type="hidden" value={item.merchant ?? ""} />
              <input name="note" type="hidden" value={item.note ?? ""} />
              <input name="occurredAt" type="hidden" value={item.occurredAt.slice(0, 10)} />
              <input name="categoryId" type="hidden" value={item.categoryId ?? ""} />
              <input name="reviewState" type="hidden" value="reviewed" />
              <input name="uncertaintyReason" type="hidden" value="" />
              <button className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700" type="submit">
                Mark tracked
              </button>
            </form>
          ) : null}

          <form action={deleteFormAction}>
            <input name="transactionId" type="hidden" value={item.id} />
            <button className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700" type="submit">
              Delete
            </button>
          </form>
        </div>
        <ActionMessage state={deleteState.status === "success" ? deleteState : updateState} />

        {isEditing ? (
          <form action={updateFormAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
            <input name="transactionId" type="hidden" value={item.id} />
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Merchant</span>
              <input
                className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                defaultValue={item.merchant ?? ""}
                name="merchant"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Note</span>
              <textarea
                className="min-h-20 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                defaultValue={item.note ?? ""}
                name="note"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Occurred date</span>
              <input
                className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                defaultValue={item.occurredAt.slice(0, 10)}
                name="occurredAt"
                type="date"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Review state</span>
              <select
                className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                defaultValue={item.reviewState}
                name="reviewState"
              >
                <option value="reviewed">Tracked</option>
                <option value="pending_review">Pending review</option>
                <option value="needs_attention">Needs review</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-slate-600">Uncertainty note</span>
              <input
                className="min-h-10 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                defaultValue={item.uncertaintyReason ?? ""}
                name="uncertaintyReason"
              />
            </label>
            <input name="categoryId" type="hidden" value={item.categoryId ?? ""} />
            <button className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-medium text-white" type="submit">
              Save changes
            </button>
            <ActionMessage state={updateState} />
          </form>
        ) : null}
      </div>
    </div>
  );
}
