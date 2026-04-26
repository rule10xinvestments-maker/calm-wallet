"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  completeStagedImportUploadAction,
  createStagedImportIntakeAction,
  createStagedImportUploadTransportAction,
} from "@/lib/actions/imports";
import {
  initialImportIntakeActionState,
  initialImportUploadCompletionActionState,
  initialImportUploadTransportActionState,
} from "@/lib/actions/imports-state";
import { uploadStagedImportFile } from "@/lib/imports/browser-upload";
import type { AssistantActionState } from "@/lib/server/assistant";

type AssistantActionHandler = (state: AssistantActionState, formData: FormData) => Promise<AssistantActionState>;

type AssistantComposerProps = {
  action: AssistantActionHandler;
  initialState: AssistantActionState;
};

type UploadFlowState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string | null;
  importType: "receipt_image" | "csv_import" | null;
  filename: string | null;
};

const initialUploadFlowState: UploadFlowState = {
  status: "idle",
  message: null,
  importType: null,
  filename: null,
};

function fileMatchesImportType(importType: "receipt_image" | "csv_import", file: File) {
  if (importType === "receipt_image") {
    return file.type.startsWith("image/");
  }

  return file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv");
}

export function AssistantComposer({ action, initialState }: AssistantComposerProps) {
  const [state, formAction, isPending] = useActionState<AssistantActionState, FormData>(action, initialState);
  const [selectedAction, setSelectedAction] = useState<
    "create_transaction" | "update_transaction" | "delete_transaction" | "recategorize_transaction" | "summarize_spending"
  >("create_transaction");
  const [selectedImportType, setSelectedImportType] = useState<"receipt_image" | "csv_import">("receipt_image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadFlowState>(initialUploadFlowState);

  async function handleImportUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState({
        status: "error",
        message: "Choose a receipt image or CSV file first.",
        importType: null,
        filename: null,
      });
      return;
    }

    if (!fileMatchesImportType(selectedImportType, selectedFile)) {
      setUploadState({
        status: "error",
        message:
          selectedImportType === "receipt_image"
            ? "Choose an image file for receipt image imports."
            : "Choose a CSV file for CSV imports.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
      return;
    }

    setUploadState({
      status: "uploading",
      message: "Uploading staged import...",
      importType: selectedImportType,
      filename: selectedFile.name,
    });

    try {
      const intakeFormData = new FormData();
      intakeFormData.set("importType", selectedImportType);
      intakeFormData.set("originalFilename", selectedFile.name);
      intakeFormData.set("mimeType", selectedFile.type || "application/octet-stream");

      const intakeResult = await createStagedImportIntakeAction(initialImportIntakeActionState, intakeFormData);

      if (intakeResult.status !== "success" || !intakeResult.intake) {
        throw new Error(intakeResult.message ?? "Unable to create staged import.");
      }

      const transportFormData = new FormData();
      transportFormData.set("importRecordId", intakeResult.intake.importRecordId);

      const transportResult = await createStagedImportUploadTransportAction(
        initialImportUploadTransportActionState,
        transportFormData,
      );

      if (transportResult.status !== "success" || !transportResult.uploadContract) {
        throw new Error(transportResult.message ?? "Unable to create upload contract.");
      }

      await uploadStagedImportFile({
        bucket: transportResult.uploadContract.bucket,
        storagePath: transportResult.uploadContract.storagePath,
        uploadToken: transportResult.uploadContract.uploadToken,
        file: selectedFile,
      });

      const completionFormData = new FormData();
      completionFormData.set("importRecordId", intakeResult.intake.importRecordId);
      completionFormData.set("storagePath", transportResult.uploadContract.storagePath);
      completionFormData.set("originalFilename", selectedFile.name);
      completionFormData.set("mimeType", selectedFile.type || "application/octet-stream");

      const completionResult = await completeStagedImportUploadAction(
        initialImportUploadCompletionActionState,
        completionFormData,
      );

      if (completionResult.status !== "success" || !completionResult.completion) {
        throw new Error(completionResult.message ?? "Unable to save staged import upload.");
      }

      setSelectedFile(null);
      setUploadState({
        status: "success",
        message: `Staged import uploaded as ${completionResult.completion.importType}.`,
        importType: completionResult.completion.importType,
        filename: completionResult.completion.originalFilename,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to upload staged import.",
        importType: selectedImportType,
        filename: selectedFile.name,
      });
    }
  }

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

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">Staged import upload</p>
          <p className="text-xs text-slate-500">Upload one receipt image or CSV file into private staged storage only.</p>
        </div>

        {uploadState.message ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              uploadState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : uploadState.status === "success"
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            <p className="font-medium">{uploadState.message}</p>
            {uploadState.status === "success" && uploadState.importType && uploadState.filename ? (
              <p className="mt-1 text-xs text-slate-600">
                Uploaded {uploadState.filename} as {uploadState.importType}.
              </p>
            ) : null}
            {uploadState.status === "error" && uploadState.filename ? (
              <p className="mt-1 text-xs text-slate-600">File: {uploadState.filename}</p>
            ) : null}
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={handleImportUploadSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Import type</span>
            <select
              aria-label="Import type"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              onChange={(event) => setSelectedImportType(event.target.value as "receipt_image" | "csv_import")}
              value={selectedImportType}
            >
              <option value="receipt_image">Receipt image</option>
              <option value="csv_import">CSV import</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">File</span>
            <input
              accept={selectedImportType === "receipt_image" ? "image/*" : ".csv,text/csv"}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>

          <Button className="w-full" disabled={uploadState.status === "uploading"} type="submit">
            {uploadState.status === "uploading" ? "Uploading..." : "Upload staged import"}
          </Button>
        </form>
      </div>

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
