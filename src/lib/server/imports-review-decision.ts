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
};

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
  const amountMinor = overrides?.amountMinor ?? candidate.amountMinor;
  const currency = overrides?.currency ?? candidate.currency;
  const itemName = overrides?.itemName ?? candidate.description ?? candidate.merchantGuess;
  const merchant = overrides?.merchant ?? candidate.merchantGuess;
  const note = overrides?.note ?? candidate.description;
  const categoryId = overrides?.categoryId ?? candidate.categoryId;

  if (!candidate.transactionType || !amountMinor || !currency || !candidate.occurredAt) {
    throw new Error("Accepted candidate is missing required transaction fields.");
  }

  const needsReview = candidate.reviewState === "needs_attention";

  return {
    transactionType: candidate.transactionType,
    amountMinor,
    currency,
    occurredAt: candidate.occurredAt,
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

  const parsed = reviewImportCandidateSchema.parse(input);
  const importCandidateService = await dependencies.createImportCandidateService();
  let candidate: ImportCandidate;

  try {
    candidate = await importCandidateService.getImportCandidateById(user.id, parsed.importCandidateId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import candidate not found.") {
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

  const createdTransaction = await transactionService.createTransaction(
    user.id,
    mapCandidateToTransactionInput({
      candidate,
      importType: importRecord.importType,
      overrides: {
        amountMinor: parsed.amountMinor,
        currency: parsed.currency,
        itemName: parsed.itemName,
        merchant: parsed.merchant,
        categoryId: parsed.categoryId,
        note: parsed.note,
      },
    }),
    { actorType: "user" },
  );
  const acceptedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
    reviewState: "reviewed",
    acceptanceState: "accepted",
    acceptedTransactionId: createdTransaction.transaction.id,
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
    transaction: createdTransaction.transaction,
    transactionCreated: true,
    reviewCompletion,
  };
}
