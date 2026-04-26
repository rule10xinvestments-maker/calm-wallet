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
import { getCurrentUser } from "@/lib/auth/session";

export type ReviewImportCandidateDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportCandidateService: () => Promise<
    Pick<ImportCandidateService, "getImportCandidateById" | "updateImportCandidateStatus">
  >;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById">>;
  createTransactionService: () => Promise<Pick<TransactionService, "createTransaction" | "listTransactions">>;
};

export type ReviewImportCandidateResult = {
  decision: "accept" | "reject";
  candidate: ImportCandidate;
  transaction: Transaction | null;
  transactionCreated: boolean;
};

const defaultDependencies: ReviewImportCandidateDependencies = {
  getCurrentUser,
  createImportCandidateService: createSupabaseImportCandidateService,
  createImportRecordService: createSupabaseImportRecordService,
  createTransactionService: createSupabaseTransactionService,
};

function mapCandidateToTransactionInput(args: {
  candidate: ImportCandidate;
  importType: "receipt_image" | "csv_import";
}): CreateTransactionInput {
  const { candidate, importType } = args;

  if (!candidate.transactionType || !candidate.amountMinor || !candidate.currency || !candidate.occurredAt) {
    throw new Error("Accepted candidate is missing required transaction fields.");
  }

  return {
    transactionType: candidate.transactionType,
    amountMinor: candidate.amountMinor,
    currency: candidate.currency,
    occurredAt: candidate.occurredAt,
    categoryId: candidate.categoryId,
    merchant: candidate.merchantGuess,
    note: candidate.description,
    source: importType,
    reviewState: "reviewed",
    uncertaintyReason: null,
    importRecordId: candidate.importRecordId,
    importCandidateId: candidate.id,
  };
}

export async function reviewImportCandidate(
  input: ReviewImportCandidateInput,
  dependencies: ReviewImportCandidateDependencies = defaultDependencies,
): Promise<ReviewImportCandidateResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
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

  try {
    await importRecordService.getImportRecordById(user.id, candidate.importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (parsed.decision === "reject") {
    const rejectedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
      reviewState: "reviewed",
      acceptanceState: "rejected",
      acceptedTransactionId: null,
    });

    return {
      decision: "reject",
      candidate: rejectedCandidate,
      transaction: null,
      transactionCreated: false,
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

    return {
      decision: "accept",
      candidate: acceptedCandidate,
      transaction: existingTransaction,
      transactionCreated: false,
    };
  }

  const importRecord = await importRecordService.getImportRecordById(user.id, candidate.importRecordId);
  const createdTransaction = await transactionService.createTransaction(
    user.id,
    mapCandidateToTransactionInput({
      candidate,
      importType: importRecord.importType,
    }),
    { actorType: "user" },
  );
  const acceptedCandidate = await importCandidateService.updateImportCandidateStatus(user.id, candidate.id, {
    reviewState: "reviewed",
    acceptanceState: "accepted",
    acceptedTransactionId: createdTransaction.transaction.id,
  });

  return {
    decision: "accept",
    candidate: acceptedCandidate,
    transaction: createdTransaction.transaction,
    transactionCreated: true,
  };
}
