import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportCandidate } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  buildImportStoragePath,
  IMPORT_STORAGE_BUCKET,
  isSupportedReceiptImageMimeType,
  RECEIPT_IMAGE_MAX_BYTES,
  sanitizeImportFilename,
} from "@/lib/imports/storage";
import type { StagedImportIntakeResult } from "@/lib/actions/imports-state";
import {
  stageReceiptCandidate,
  type StageReceiptCandidateDependencies,
} from "@/lib/server/receipt-candidate-staging";
import {
  buildReceiptDraft,
  type ReceiptDraftCategory,
} from "@/lib/server/receipt-draft";
import {
  extractReceiptTextFromImage,
  type ReceiptOcrImage,
  type ReceiptOcrResult,
} from "@/lib/server/receipt-ocr";

type ReceiptUploadFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;
type ReceiptImportRecordService = Pick<
  ImportRecordService,
  "createImportRecord" | "getImportRecordById" | "updateImportRecordStatus"
>;

export type UploadReceiptImageDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "createImportRecord">>;
  uploadObject: (input: {
    bucket: typeof IMPORT_STORAGE_BUCKET;
    storagePath: string;
    file: ReceiptUploadFile;
    contentType: string;
  }) => Promise<void>;
  buildImportStoragePath: typeof buildImportStoragePath;
  sanitizeImportFilename: typeof sanitizeImportFilename;
  now: () => Date;
};

const defaultDependencies: UploadReceiptImageDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  uploadObject: uploadReceiptImageObject,
  buildImportStoragePath,
  sanitizeImportFilename,
  now: () => new Date(),
};

export type ReceiptImagePreparedUploadResult = {
  upload: StagedImportIntakeResult;
  candidate: ImportCandidate | null;
};

export type UploadReceiptImageAndPrepareDraftDependencies = Omit<
  UploadReceiptImageDependencies,
  "createImportRecordService"
> &
  Pick<StageReceiptCandidateDependencies, "createImportCandidateService" | "createCategoryMemoryService"> & {
    createImportRecordService: () => Promise<ReceiptImportRecordService>;
    loadDefaultCurrency: (userId: string) => Promise<string>;
    loadReceiptCategories: () => Promise<ReceiptDraftCategory[]>;
    extractReceiptText: (
      image: ReceiptOcrImage,
      context: { importRecordId?: string | null; storagePath?: string | null },
    ) => Promise<ReceiptOcrResult>;
  };

const defaultPreparedUploadDependencies: UploadReceiptImageAndPrepareDraftDependencies = {
  ...defaultDependencies,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: async () => {
    const { createSupabaseImportCandidateService } = await import("@/domain/imports/service");
    return createSupabaseImportCandidateService();
  },
  createCategoryMemoryService: async () => {
    const { createSupabaseCategoryMemoryService } = await import("@/domain/category-memory/service");
    return createSupabaseCategoryMemoryService();
  },
  loadDefaultCurrency: loadReceiptDefaultCurrency,
  loadReceiptCategories,
  extractReceiptText: extractReceiptTextFromImage,
};

function validateReceiptImageFile(file: ReceiptUploadFile | null): asserts file is ReceiptUploadFile {
  if (!file) {
    throw new Error("Choose a receipt image first.");
  }

  if (!isSupportedReceiptImageMimeType(file.type)) {
    throw new Error("Receipt upload must be a supported image file.");
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error("Receipt image must not be empty.");
  }

  if (file.size > RECEIPT_IMAGE_MAX_BYTES) {
    throw new Error("Receipt image is too large.");
  }
}

async function uploadReceiptImageObject(input: {
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  file: ReceiptUploadFile;
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

async function loadReceiptDefaultCurrency(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("default_currency").eq("id", userId).single();
  return data?.default_currency ?? "USD";
}

async function loadReceiptCategories(): Promise<ReceiptDraftCategory[]> {
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

async function safelyExtractReceiptText(args: {
  file: ReceiptUploadFile | null;
  upload: StagedImportIntakeResult;
  extractReceiptText: UploadReceiptImageAndPrepareDraftDependencies["extractReceiptText"];
}) {
  if (!args.file) {
    return {
      status: "extraction_unavailable" as const,
      text: null,
      provider: "none" as const,
      internalCode: "receipt_ocr_file_unavailable",
    };
  }

  try {
    return await args.extractReceiptText(args.file, {
      importRecordId: args.upload.importRecordId,
      storagePath: args.upload.storagePath,
    });
  } catch (error) {
    console.warn("receipt_ocr_failed", {
      code: "receipt_ocr_unhandled_exception",
      status: "extraction_failed",
      provider: "unknown",
      importRecordId: args.upload.importRecordId,
      storagePath: args.upload.storagePath,
      errorName: error instanceof Error ? error.name : typeof error,
      errorMessage: error instanceof Error ? error.message : undefined,
    });
    return {
      status: "extraction_failed" as const,
      text: null,
      provider: "none" as const,
      internalCode: "receipt_ocr_unhandled_exception",
    };
  }
}

export async function uploadReceiptImage(
  file: ReceiptUploadFile | null,
  dependencies: UploadReceiptImageDependencies = defaultDependencies,
): Promise<StagedImportIntakeResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  validateReceiptImageFile(file);

  const safeFilename = dependencies.sanitizeImportFilename(file.name);
  const storagePath = dependencies.buildImportStoragePath({
    userId: user.id,
    importType: "receipt_image",
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
    importType: "receipt_image",
    storagePath,
    originalFilename: safeFilename,
    mimeType: file.type,
    status: "uploaded",
  });

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    storagePath: importRecord.storagePath,
    sanitizedFilename: safeFilename,
    originalFilename: importRecord.originalFilename,
    mimeType: importRecord.mimeType,
    status: importRecord.status,
    storagePrepared: true,
  };
}

export async function uploadReceiptImageAndPrepareDraft(
  file: ReceiptUploadFile | null,
  dependencies: UploadReceiptImageAndPrepareDraftDependencies = defaultPreparedUploadDependencies,
): Promise<ReceiptImagePreparedUploadResult | null> {
  const upload = await uploadReceiptImage(file, dependencies);

  if (!upload) {
    return null;
  }

  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const [defaultCurrency, categories] = await Promise.all([
    dependencies.loadDefaultCurrency(user.id),
    dependencies.loadReceiptCategories(),
  ]);
  const extractionResult = await safelyExtractReceiptText({
    file,
    upload,
    extractReceiptText: dependencies.extractReceiptText,
  });
  const draft = buildReceiptDraft({
    extractedText: extractionResult.text,
    originalFilename: upload.originalFilename,
    defaultCurrency,
    categories,
    now: dependencies.now(),
  });
  const candidate = await stageReceiptCandidate(
    {
      importRecordId: upload.importRecordId,
      transactionType: draft.transactionType,
      amountMinor: draft.amountMinor,
      currency: draft.currency,
      occurredAt: draft.occurredAt,
      description: draft.description,
      merchantGuess: draft.merchantGuess,
      categoryId: draft.categoryId,
      confidenceScore: draft.confidenceScore,
      reviewState: draft.reviewState,
      uncertaintyReason: draft.uncertaintyReason,
    },
    {
      getCurrentUser: dependencies.getCurrentUser,
      createImportRecordService: dependencies.createImportRecordService,
      createImportCandidateService: dependencies.createImportCandidateService,
      createCategoryMemoryService: dependencies.createCategoryMemoryService,
    },
  );

  return {
    upload,
    candidate,
  };
}
