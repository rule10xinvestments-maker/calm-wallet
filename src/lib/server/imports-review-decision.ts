import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import { reviewImportCandidateSchema } from "@/domain/imports/schemas";
import type { ImportCandidate, ReviewImportCandidateInput } from "@/domain/imports/types";
import { createSupabaseTransactionService, type TransactionService } from "@/domain/transactions/service";
import type { CreateTransactionInput, Transaction } from "@/domain/transactions/types";
import {
  createSupabaseCategoryMemoryService,
  type CategoryMemoryService,
} from "@/domain/category-memory/service";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  completeOwnedImportReviewIfReady,
  type ImportReviewCompletionResult,
} from "@/lib/server/imports-review-completion";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type ReviewImportCandidateDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportCandidateService: () => Promise<
    Pick<ImportCandidateService, "getImportCandidateById" | "listImportCandidates" | "updateImportCandidateStatus">
  >;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
  createTransactionService: () => Promise<Pick<TransactionService, "createTransaction" | "listTransactions">>;
  createCategoryMemoryService?: () => Promise<Pick<CategoryMemoryService, "recordCategoryCorrectionMemory">>;
  loadCategoryOptions?: () => Promise<ReceiptSaveCategoryOption[]>;
};

export type ReviewImportCandidateResult = {
  decision: "accept" | "reject";
  candidate: ImportCandidate;
  transaction: Transaction | null;
  transactionCreated: boolean;
  reviewCompletion: ImportReviewCompletionResult;
};

const defaultDependencies: ReviewImportCandidateDependencies = {
  getCurrentUser,
  createImportCandidateService: createSupabaseImportCandidateService,
  createImportRecordService: createSupabaseImportRecordService,
  createTransactionService: createSupabaseTransactionService,
  createCategoryMemoryService: createSupabaseCategoryMemoryService,
  loadCategoryOptions: loadReceiptSaveCategoryOptions,
};

type ReceiptSaveFailureCode =
  | "receipt_save_payload_invalid"
  | "receipt_save_candidate_not_found"
  | "receipt_save_category_invalid"
  | "receipt_save_transaction_insert_failed"
  | "receipt_save_candidate_resolve_failed";

type ReceiptSaveCategoryOption = {
  id: string;
  slug: string;
  label: string;
  direction: "expense" | "income" | "both";
};

export class ReceiptSaveError extends Error {
  code: ReceiptSaveFailureCode;

  constructor(code: ReceiptSaveFailureCode, message: string) {
    super(message);
    this.name = "ReceiptSaveError";
    this.code = code;
  }
}

async function loadReceiptSaveCategoryOptions(): Promise<ReceiptSaveCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,slug,label,direction")
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((category) => ({
    id: category.id,
    slug: category.slug,
    label: category.label,
    direction: category.direction,
  }));
}

function logReceiptSaveFailure(args: {
  code: ReceiptSaveFailureCode;
  stage: string;
  importCandidateId?: string | null;
  importRecordId?: string | null;
  error?: unknown;
}) {
  console.error("receipt_save_failed", {
    code: args.code,
    stage: args.stage,
    importCandidateId: args.importCandidateId ?? null,
    importRecordId: args.importRecordId ?? null,
    errorName: args.error instanceof Error ? args.error.name : typeof args.error,
    errorCode: args.error instanceof ReceiptSaveError ? args.error.code : undefined,
  });
}

function isSupportedImportType(value: string): value is "receipt_image" | "csv_import" {
  return SUPPORTED_IMPORT_TYPES.includes(value as "receipt_image" | "csv_import");
}

function mapCandidateToTransactionInput(args: {
  candidate: ImportCandidate;
  importType: "receipt_image" | "csv_import";
  overrides?: {
    amountMinor?: number | null;
    currency?: string | null;
    itemName?: string | null;
    merchant?: string | null;
    categoryId?: string | null;
    note?: string | null;
  };
}): CreateTransactionInput {
  const { candidate, importType, overrides } = args;
  const hasOverride = (key: keyof NonNullable<typeof overrides>) =>
    Boolean(overrides && Object.prototype.hasOwnProperty.call(overrides, key));
  const transactionType = candidate.transactionType ?? (importType === "receipt_image" ? "expense" : null);
  const amountMinor = overrides?.amountMinor ?? candidate.amountMinor;
  const currency = overrides?.currency ?? candidate.currency;
  const itemName = overrides?.itemName ?? candidate.description ?? candidate.merchantGuess;
  const merchant = hasOverride("merchant") ? overrides?.merchant : candidate.merchantGuess;
  const note = overrides?.note ?? candidate.description;
  const categoryId = hasOverride("categoryId") ? overrides?.categoryId : candidate.categoryId;
  const occurredAt = candidate.occurredAt ?? candidate.createdAt;

  if (!transactionType || !amountMinor || !currency || !occurredAt) {
    throw new Error("Accepted candidate is missing required transaction fields.");
  }

  const needsReview = candidate.reviewState === "needs_attention";

  return {
    transactionType,
    amountMinor,
    currency,
    occurredAt,
    categoryId,
    itemName,
    merchant,
    note,
    source: importType,
    reviewState: needsReview ? "needs_attention" : "reviewed",
    uncertaintyReason: needsReview
      ? candidate.uncertaintyReason || "Receipt total was added manually from Activity."
      : null,
    importRecordId: candidate.importRecordId,
    importCandidateId: candidate.id,
  };
}

function normalizeCategoryLookupValue(value: string) {
  return value.trim().toLowerCase();
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function categorySupportsTransactionType(category: ReceiptSaveCategoryOption, transactionType: "expense" | "income" | null) {
  return !transactionType || category.direction === "both" || category.direction === transactionType;
}

async function resolveCategoryId(args: {
  value: string | null | undefined;
  transactionType: "expense" | "income" | null;
  dependencies: ReviewImportCandidateDependencies;
  importCandidateId: string;
  importRecordId: string;
}) {
  const value = args.value?.trim();

  if (!value) {
    return null;
  }

  if (looksLikeUuid(value)) {
    return value;
  }

  const categories = args.dependencies.loadCategoryOptions ? await args.dependencies.loadCategoryOptions() : [];
  const normalized = normalizeCategoryLookupValue(value);
  const match = categories.find(
    (category) =>
      categorySupportsTransactionType(category, args.transactionType) &&
      (category.id === value ||
        normalizeCategoryLookupValue(category.slug) === normalized ||
        normalizeCategoryLookupValue(category.label) === normalized),
  );

  if (!match) {
    logReceiptSaveFailure({
      code: "receipt_save_category_invalid",
      stage: "resolve_category",
      importCandidateId: args.importCandidateId,
      importRecordId: args.importRecordId,
    });
    throw new ReceiptSaveError("receipt_save_category_invalid", "Receipt save category is invalid.");
  }

  return match.id;
}

async function recordAcceptedCandidateMemory(args: {
  userId: string;
  candidate: ImportCandidate;
  categoryMemoryService: Pick<CategoryMemoryService, "recordCategoryCorrectionMemory"> | null;
}) {
  if (!args.categoryMemoryService || !args.candidate.categoryId || !args.candidate.transactionType) {
    return;
  }

  const signals = [
    args.candidate.merchantGuess
      ? {
          signalType: "merchant" as const,
          signalValue: args.candidate.merchantGuess,
        }
      : null,
    args.candidate.description
      ? {
          signalType: "import_description" as const,
          signalValue: args.candidate.description,
        }
      : null,
  ].filter(
    (signal): signal is { signalType: "merchant" | "import_description"; signalValue: string } =>
      signal !== null && signal.signalValue.trim().length >= 3,
  );

  for (const signal of signals) {
    await args.categoryMemoryService.recordCategoryCorrectionMemory(args.userId, {
      ...signal,
      preferredCategoryId: args.candidate.categoryId,
      preferredTransactionType: args.candidate.transactionType,
    });
  }
}

export async function reviewImportCandidate(
  input: ReviewImportCandidateInput,
  dependencies: ReviewImportCandidateDependencies = defaultDependencies,
): Promise<ReviewImportCandidateResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    throw new Error("Receipt save requires sign in.");
  }

  let parsed: ReturnType<typeof reviewImportCandidateSchema.parse>;

  try {
    parsed = reviewImportCandidateSchema.parse(input);
  } catch (error) {
    logReceiptSaveFailure({
      code: "receipt_save_payload_invalid",
      stage: "parse_payload",
      importCandidateId: input.importCandidateId,
      error,
    });
    throw new ReceiptSaveError("receipt_save_payload_invalid", "Receipt save payload is invalid.");
  }

  const importCandidateService = await dependencies.createImportCandidateService();
  let candidate: ImportCandidate;

  try {
    candidate = await importCandidateService.getImportCandidateById(user.id, parsed.importCandidateId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import candidate not found.") {
      logReceiptSaveFailure({
        code: "receipt_save_candidate_not_found",
        stage: "load_candidate",
        importCandidateId: parsed.importCandidateId,
        error,
      });
      return null;
    }

    throw error;
  }

  const importRecordService = await dependencies.createImportRecordService();
  let importRecord: Awaited<ReturnType<ImportRecordService["getImportRecordById"]>>;

  try {
    importRecord = await importRecordService.getImportRecordById(user.id, candidate.importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (!isSupportedImportType(importRecord.importType)) {
    throw new Error("Unsupported import type.");
  }

  const targetAcceptanceState = parsed.decision === "accept" ? "accepted" : "rejected";

  if (candidate.acceptanceState !== "pending" && candidate.acceptanceState !== targetAcceptanceState) {
    throw new Error("Import candidate has already been reviewed.");
  }

  if (parsed.decision === "reject" && candidate.acceptanceState === "rejected") {
    const reviewCompletion = await completeOwnedImportReviewIfReady(user.id, candidate.importRecordId, {
      importRecordService,
      importCandidateService,
    });

    return {
      decision: "reject",
      candidate,
      transaction: null,
      transactionCreated: false,
      reviewCompletion,
    };
  }

  if (parsed.decision === "reject") {
    const rejectedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
      reviewState: "reviewed",
      acceptanceState: "rejected",
      acceptedTransactionId: null,
    });
    const reviewCompletion = await completeOwnedImportReviewIfReady(user.id, candidate.importRecordId, {
      importRecordService,
      importCandidateService,
    });

    return {
      decision: "reject",
      candidate: rejectedCandidate,
      transaction: null,
      transactionCreated: false,
      reviewCompletion,
    };
  }

  const transactionService = await dependencies.createTransactionService();
  const existingTransactions = await transactionService.listTransactions(user.id, {
    importCandidateId: candidate.id,
    includeDeleted: true,
    limit: 1,
  });
  const existingTransaction = existingTransactions[0] ?? null;

  if (existingTransaction) {
    const acceptedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
      reviewState: "reviewed",
      acceptanceState: "accepted",
      acceptedTransactionId: existingTransaction.id,
    });
    const reviewCompletion = await completeOwnedImportReviewIfReady(user.id, candidate.importRecordId, {
      importRecordService,
      importCandidateService,
    });
    await recordAcceptedCandidateMemory({
      userId: user.id,
      candidate: acceptedCandidate,
      categoryMemoryService: dependencies.createCategoryMemoryService
        ? await dependencies.createCategoryMemoryService()
        : null,
    });

    return {
      decision: "accept",
      candidate: acceptedCandidate,
      transaction: existingTransaction,
      transactionCreated: false,
      reviewCompletion,
    };
  }

  const transactionType = candidate.transactionType ?? (importRecord.importType === "receipt_image" ? "expense" : null);
  const categoryId = await resolveCategoryId({
    value: parsed.categoryId ?? candidate.categoryId,
    transactionType,
    dependencies,
    importCandidateId: candidate.id,
    importRecordId: candidate.importRecordId,
  });
  let createdTransaction: Awaited<ReturnType<TransactionService["createTransaction"]>>;

  try {
    createdTransaction = await transactionService.createTransaction(
      user.id,
      mapCandidateToTransactionInput({
      candidate,
      importType: importRecord.importType,
      overrides: {
        amountMinor: parsed.amountMinor,
        currency: parsed.currency,
        itemName: parsed.itemName,
        merchant: parsed.merchant,
          categoryId,
        note: parsed.note,
      },
      }),
      { actorType: "user" },
    );
  } catch (error) {
    logReceiptSaveFailure({
      code: "receipt_save_transaction_insert_failed",
      stage: "create_transaction",
      importCandidateId: candidate.id,
      importRecordId: candidate.importRecordId,
      error,
    });
    throw error;
  }

  let acceptedCandidate: ImportCandidate;

  try {
    acceptedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
      reviewState: "reviewed",
      acceptanceState: "accepted",
      acceptedTransactionId: createdTransaction.transaction.id,
    });
  } catch (error) {
    logReceiptSaveFailure({
      code: "receipt_save_candidate_resolve_failed",
      stage: "resolve_candidate",
      importCandidateId: candidate.id,
      importRecordId: candidate.importRecordId,
      error,
    });
    throw error;
  }
  const reviewCompletion = await completeOwnedImportReviewIfReady(user.id, candidate.importRecordId, {
    importRecordService,
    importCandidateService,
  });
  await recordAcceptedCandidateMemory({
    userId: user.id,
    candidate: acceptedCandidate,
    categoryMemoryService: dependencies.createCategoryMemoryService
      ? await dependencies.createCategoryMemoryService()
      : null,
  });

  return {
    decision: "accept",
    candidate: acceptedCandidate,
    transaction: createdTransaction.transaction,
    transactionCreated: true,
    reviewCompletion,
  };
}
