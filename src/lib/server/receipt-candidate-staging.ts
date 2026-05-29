import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import { createImportCandidateSchema, getImportRecordSchema } from "@/domain/imports/schemas";
import type { ImportCandidate } from "@/domain/imports/types";
import {
  createSupabaseCategoryMemoryService,
  type CategoryMemoryService,
} from "@/domain/category-memory/service";
import { getCurrentUser } from "@/lib/auth/session";

export type StageReceiptCandidateInput = {
  importRecordId: string;
  transactionType: "expense" | "income";
  amountMinor: number;
  currency: string;
  occurredAt: string;
  description?: string | null;
  merchantGuess?: string | null;
};

export type StageReceiptCandidateDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
  createImportCandidateService: () => Promise<Pick<ImportCandidateService, "createImportCandidate">>;
  createCategoryMemoryService?: () => Promise<Pick<CategoryMemoryService, "findCategoryMemoryMatch">>;
};

const defaultDependencies: StageReceiptCandidateDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: createSupabaseImportCandidateService,
  createCategoryMemoryService: createSupabaseCategoryMemoryService,
};

export async function stageReceiptCandidate(
  input: StageReceiptCandidateInput,
  dependencies: StageReceiptCandidateDependencies = defaultDependencies,
): Promise<ImportCandidate | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const recordId = getImportRecordSchema.parse({ importRecordId: input.importRecordId }).importRecordId;
  const importRecordService = await dependencies.createImportRecordService();
  let importRecord;

  try {
    importRecord = await importRecordService.getImportRecordById(user.id, recordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (importRecord.importType !== "receipt_image") {
    throw new Error("Only receipt image imports can stage receipt candidates.");
  }

  if (!["uploaded", "parsing", "parsed"].includes(importRecord.status)) {
    throw new Error("Receipt import is not available for candidate staging.");
  }

  const categoryMemoryService = dependencies.createCategoryMemoryService
    ? await dependencies.createCategoryMemoryService()
    : null;
  const memoryMatch = categoryMemoryService
    ? await categoryMemoryService.findCategoryMemoryMatch(user.id, {
        merchant: input.merchantGuess,
        description: input.description,
        transactionType: input.transactionType,
      })
    : null;
  const parsedCandidate = createImportCandidateSchema.parse({
    importRecordId: recordId,
    transactionType: input.transactionType,
    amountMinor: input.amountMinor,
    currency: input.currency,
    occurredAt: input.occurredAt,
    description: input.description,
    merchantGuess: input.merchantGuess,
    categoryId: memoryMatch?.strength === "strong" ? memoryMatch.category.id : null,
    confidenceScore: null,
    reviewState: "pending_review",
    acceptanceState: "pending",
  });
  const importCandidateService = await dependencies.createImportCandidateService();
  const candidate = await importCandidateService.createImportCandidate(user.id, parsedCandidate);

  if (importRecord.status !== "parsed") {
    await importRecordService.updateImportRecordStatus(user.id, recordId, {
      status: "parsed",
      parseQuality: "unknown",
      failureReason: null,
    });
  }

  return candidate;
}
