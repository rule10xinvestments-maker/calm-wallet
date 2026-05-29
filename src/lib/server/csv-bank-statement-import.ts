import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import type { ParserResultCandidateInput } from "@/domain/imports/types";
import {
  createSupabaseCategoryMemoryService,
  type CategoryMemoryService,
} from "@/domain/category-memory/service";
import { createSupabaseTransactionService, type TransactionService } from "@/domain/transactions/service";
import type { Transaction } from "@/domain/transactions/types";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { parseCsvBankStatement } from "@/lib/imports/csv-bank-statement-parser";
import {
  buildImportStoragePath,
  CSV_IMPORT_MAX_BYTES,
  IMPORT_STORAGE_BUCKET,
  isSupportedCsvMimeType,
  sanitizeImportFilename,
} from "@/lib/imports/storage";
import { ingestImportParserResult, type IngestImportParserResultResult } from "@/lib/server/imports-parser-result-ingestion";
import type { StagedImportIntakeResult } from "@/lib/actions/imports-state";

type CsvUploadFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

export type CsvBankStatementUploadResult = {
  upload: StagedImportIntakeResult;
  ingestion: IngestImportParserResultResult | null;
  parserSkippedRowCount: number;
  duplicateRowCount: number;
};

export type UploadCsvBankStatementDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<
    Pick<ImportRecordService, "createImportRecord" | "getImportRecordById" | "updateImportRecordStatus">
  >;
  createImportCandidateService: () => Promise<Pick<ImportCandidateService, "createImportCandidate" | "listImportCandidates">>;
  createTransactionService: () => Promise<Pick<TransactionService, "listTransactions">>;
  createCategoryMemoryService?: () => Promise<Pick<CategoryMemoryService, "findCategoryMemoryMatch">>;
  uploadObject: (input: {
    bucket: typeof IMPORT_STORAGE_BUCKET;
    storagePath: string;
    file: CsvUploadFile;
    contentType: string;
  }) => Promise<void>;
  buildImportStoragePath: typeof buildImportStoragePath;
  sanitizeImportFilename: typeof sanitizeImportFilename;
  now: () => Date;
};

const defaultDependencies: UploadCsvBankStatementDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: createSupabaseImportCandidateService,
  createTransactionService: createSupabaseTransactionService,
  createCategoryMemoryService: createSupabaseCategoryMemoryService,
  uploadObject: uploadCsvObject,
  buildImportStoragePath,
  sanitizeImportFilename,
  now: () => new Date(),
};

function validateCsvFile(file: CsvUploadFile | null): asserts file is CsvUploadFile {
  if (!file) {
    throw new Error("Choose a CSV file first.");
  }

  if (!isSupportedCsvMimeType(file.type, file.name)) {
    throw new Error("CSV import must be a CSV file.");
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error("CSV file must not be empty.");
  }

  if (file.size > CSV_IMPORT_MAX_BYTES) {
    throw new Error("CSV file is too large.");
  }
}

async function uploadCsvObject(input: {
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  file: CsvUploadFile;
  contentType: string;
}) {
  const supabase = await createSupabaseServerClient();
  const bytes = await input.file.arrayBuffer();
  const result = await supabase.storage.from(input.bucket).upload(input.storagePath, bytes, {
    contentType: input.contentType,
    upsert: false,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

function toTransactionSignature(input: {
  amountMinor: number | null;
  occurredAt: string | null;
  description: string | null;
  merchant: string | null;
}) {
  const date = input.occurredAt?.slice(0, 10) ?? null;
  const description = (input.merchant || input.description || "").trim().toLowerCase().replace(/\s+/g, " ");

  return JSON.stringify([input.amountMinor, date, description]);
}

function removeDuplicateCandidates(args: {
  candidates: ParserResultCandidateInput[];
  existingTransactions: Transaction[];
}) {
  const existingTransactionSignatures = new Set(
    args.existingTransactions.map((transaction) =>
      toTransactionSignature({
        amountMinor: transaction.amountMinor,
        occurredAt: transaction.occurredAt,
        description: transaction.note,
        merchant: transaction.merchant,
      }),
    ),
  );
  const seenCandidateSignatures = new Set<string>();
  const candidates: ParserResultCandidateInput[] = [];
  let duplicateRowCount = 0;

  for (const candidate of args.candidates) {
    const signature = toTransactionSignature({
      amountMinor: candidate.amountMinor ?? null,
      occurredAt: candidate.occurredAt ?? null,
      description: candidate.description ?? null,
      merchant: candidate.merchantGuess ?? null,
    });

    if (seenCandidateSignatures.has(signature) || existingTransactionSignatures.has(signature)) {
      duplicateRowCount += 1;
      continue;
    }

    seenCandidateSignatures.add(signature);
    candidates.push(candidate);
  }

  return { candidates, duplicateRowCount };
}

async function applyCategoryMemoryToCandidates(args: {
  userId: string;
  candidates: ParserResultCandidateInput[];
  categoryMemoryService: Pick<CategoryMemoryService, "findCategoryMemoryMatch">;
}) {
  const results: ParserResultCandidateInput[] = [];

  for (const candidate of args.candidates) {
    if (candidate.categoryId) {
      results.push(candidate);
      continue;
    }

    const match = await args.categoryMemoryService.findCategoryMemoryMatch(args.userId, {
      merchant: candidate.merchantGuess,
      description: candidate.description,
      transactionType: candidate.transactionType ?? null,
    });

    results.push({
      ...candidate,
      ...(match?.strength === "strong" ? { categoryId: match.category.id } : {}),
    });
  }

  return results;
}

export async function uploadCsvBankStatement(
  file: CsvUploadFile | null,
  dependencies: UploadCsvBankStatementDependencies = defaultDependencies,
): Promise<CsvBankStatementUploadResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  validateCsvFile(file);

  const safeFilename = dependencies.sanitizeImportFilename(file.name);
  const storagePath = dependencies.buildImportStoragePath({
    userId: user.id,
    importType: "csv_import",
    originalFilename: safeFilename,
    now: dependencies.now(),
  });

  await dependencies.uploadObject({
    bucket: IMPORT_STORAGE_BUCKET,
    storagePath,
    file,
    contentType: file.type,
  });

  const importRecordService = await dependencies.createImportRecordService();
  const importRecord = await importRecordService.createImportRecord(user.id, {
    importType: "csv_import",
    storagePath,
    originalFilename: safeFilename,
    mimeType: file.type,
    status: "uploaded",
  });
  const upload: StagedImportIntakeResult = {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    storagePath: importRecord.storagePath,
    sanitizedFilename: safeFilename,
    originalFilename: importRecord.originalFilename,
    mimeType: importRecord.mimeType,
    status: importRecord.status,
    storagePrepared: true,
  };

  await importRecordService.updateImportRecordStatus(user.id, importRecord.id, {
    status: "parsing",
    parseQuality: "unknown",
    failureReason: null,
  });

  try {
    const bytes = await file.arrayBuffer();
    const parserResult = parseCsvBankStatement(new TextDecoder("utf-8", { fatal: false }).decode(bytes));
    const categoryMemoryService = dependencies.createCategoryMemoryService
      ? await dependencies.createCategoryMemoryService()
      : null;
    const candidatesWithMemory = categoryMemoryService
      ? await applyCategoryMemoryToCandidates({
          userId: user.id,
          candidates: parserResult.candidates,
          categoryMemoryService,
        })
      : parserResult.candidates;
    const transactionService = await dependencies.createTransactionService();
    const existingTransactions = await transactionService.listTransactions(user.id, {
      includeDeleted: false,
      limit: 100,
    });
    const deduped = removeDuplicateCandidates({
      candidates: candidatesWithMemory,
      existingTransactions,
    });
    const ingestion = await ingestImportParserResult(
      {
        importRecordId: importRecord.id,
        candidates: deduped.candidates,
      },
      {
        getCurrentUser: dependencies.getCurrentUser,
        createImportRecordService: dependencies.createImportRecordService,
        createImportCandidateService: dependencies.createImportCandidateService,
      },
    );

    return {
      upload,
      ingestion,
      parserSkippedRowCount: parserResult.skippedRowCount,
      duplicateRowCount: deduped.duplicateRowCount,
    };
  } catch (error) {
    await importRecordService.updateImportRecordStatus(user.id, importRecord.id, {
      status: "failed",
      parseQuality: "low",
      failureReason: error instanceof Error ? error.message : "CSV import could not be parsed.",
    });

    return {
      upload,
      ingestion: null,
      parserSkippedRowCount: 0,
      duplicateRowCount: 0,
    };
  }
}

export type { CsvUploadFile };
