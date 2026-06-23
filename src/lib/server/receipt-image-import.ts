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
  type ReceiptOcrFailureStatus,
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
    loadReceiptImageFromStorage?: (input: {
      bucket: typeof IMPORT_STORAGE_BUCKET;
      storagePath: string;
      filename: string;
      mimeType: string;
    }) => Promise<ReceiptOcrImage>;
    extractReceiptText: (
      image: ReceiptOcrImage,
      context: { importRecordId?: string | null; storagePath?: string | null },
    ) => Promise<ReceiptOcrResult>;
    persistReceiptOcrStatus?: (input: {
      userId: string;
      importRecordId: string;
      status: ReceiptOcrFailureStatus;
    }) => Promise<void>;
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
  loadReceiptImageFromStorage,
  extractReceiptText: extractReceiptTextFromImage,
  persistReceiptOcrStatus,
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

async function loadReceiptImageFromStorage(input: {
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  filename: string;
  mimeType: string;
}): Promise<ReceiptOcrImage> {
  const supabase = await createSupabaseServerClient();
  const result = await supabase.storage.from(input.bucket).download(input.storagePath);

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Receipt image could not be loaded.");
  }

  return {
    name: input.filename,
    type: input.mimeType,
    size: result.data.size,
    arrayBuffer: () => result.data.arrayBuffer(),
  };
}

async function persistReceiptOcrStatus(input: {
  userId: string;
  importRecordId: string;
  status: ReceiptOcrFailureStatus;
}) {
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from("import_records")
    .update({ failure_reason: `ocr_status:${input.status}` })
    .eq("user_id", input.userId)
    .eq("id", input.importRecordId);

  if (result.error) {
    console.warn("receipt_ocr_failed", {
      stage: "ocr_status_persist_failed",
      code: "receipt_ocr_status_persist_failed",
      status: input.status,
      provider: "none",
      importRecordId: input.importRecordId,
      errorName: "SupabaseError",
      errorCode: result.error.code,
      errorMessage: result.error.message,
    });
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
  loadReceiptImageFromStorage?: UploadReceiptImageAndPrepareDraftDependencies["loadReceiptImageFromStorage"];
  extractReceiptText: UploadReceiptImageAndPrepareDraftDependencies["extractReceiptText"];
}) {
  if (!args.file) {
    return {
      status: "extraction_unavailable" as const,
      text: null,
      fields: null,
      provider: "none" as const,
      internalCode: "receipt_ocr_file_unavailable",
    };
  }

  let image: ReceiptOcrImage = args.file;

  if (args.loadReceiptImageFromStorage) {
    try {
      console.info("receipt_ocr_stage", {
        stage: "ocr_image_load_started",
        code: "receipt_ocr_private_image_load_started",
        importRecordId: args.upload.importRecordId,
        storagePath: args.upload.storagePath,
        mimeType: args.upload.mimeType,
      });
      image = await args.loadReceiptImageFromStorage({
        bucket: IMPORT_STORAGE_BUCKET,
        storagePath: args.upload.storagePath,
        filename: args.upload.originalFilename,
        mimeType: args.upload.mimeType,
      });
      console.info("receipt_ocr_stage", {
        stage: "ocr_image_loaded",
        code: "receipt_ocr_private_image_loaded",
        importRecordId: args.upload.importRecordId,
        storagePath: args.upload.storagePath,
        mimeType: args.upload.mimeType,
        size: image.size,
      });
    } catch (error) {
      console.warn("receipt_ocr_failed", {
        stage: "ocr_image_load_failed",
        code: "receipt_ocr_private_image_load_failed",
        status: "extraction_failed",
        provider: "none",
        importRecordId: args.upload.importRecordId,
        storagePath: args.upload.storagePath,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      return {
        status: "extraction_failed" as const,
        text: null,
        fields: null,
        provider: "none" as const,
        internalCode: "receipt_ocr_private_image_load_failed",
      };
    }
  }

  try {
    return await args.extractReceiptText(image, {
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
      fields: null,
      provider: "none" as const,
      internalCode: "receipt_ocr_unhandled_exception",
    };
  }
}

function getReceiptOcrStatus(args: {
  extractionResult: ReceiptOcrResult;
  amountMinor: number | null;
  candidateAmountMinor?: number | null;
}): ReceiptOcrFailureStatus {
  if (args.candidateAmountMinor || args.amountMinor) {
    if (args.extractionResult.provider === "local_tesseract") {
      return "local_ocr_success";
    }

    return "extraction_success";
  }

  if (args.extractionResult.provider === "local_tesseract") {
    if (args.extractionResult.text || args.extractionResult.fields) {
      return "local_ocr_partial";
    }

    return "local_ocr_failed";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_provider_unavailable") {
    return "unavailable";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_private_image_load_failed") {
    return "image_load_failed";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_provider_rate_limited") {
    return "provider_rate_limited";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_provider_quota_exceeded") {
    return "provider_quota_exceeded";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_provider_auth_failed") {
    return "provider_auth_failed";
  }

  if (
    args.extractionResult.internalCode === "receipt_ocr_provider_response_failed" ||
    args.extractionResult.internalCode === "receipt_ocr_provider_exception" ||
    args.extractionResult.internalCode === "receipt_ocr_unhandled_exception" ||
    args.extractionResult.internalCode === "receipt_ocr_image_optimization_required"
  ) {
    return "provider_failed";
  }

  if (args.extractionResult.internalCode === "receipt_ocr_text_empty") {
    return "extraction_empty";
  }

  if (args.extractionResult.text || args.extractionResult.fields) {
    return "extraction_partial";
  }

  return "candidate_prefill_failed";
}

function getReceiptOcrReviewMessage(status: ReceiptOcrFailureStatus) {
  if (status === "extraction_success" || status === "local_ocr_success") {
    return "We found a total. Please review before saving.";
  }

  if (status === "extraction_partial" || status === "local_ocr_partial") {
    return "We found some details. Add the missing amount before saving.";
  }

  return "We couldn't read the total. Add amount before saving.";
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
    loadReceiptImageFromStorage: dependencies.loadReceiptImageFromStorage,
    extractReceiptText: dependencies.extractReceiptText,
  });
  const draft = buildReceiptDraft({
    extractedText: extractionResult.text,
    extractedFields: extractionResult.fields,
    originalFilename: upload.originalFilename,
    defaultCurrency,
    categories,
    now: dependencies.now(),
  });
  const draftOcrStatus = getReceiptOcrStatus({
    extractionResult,
    amountMinor: draft.amountMinor,
  });
  console.info("receipt_ocr_stage", {
    stage: draft.amountMinor ? "ocr_parse_success" : extractionResult.text || extractionResult.fields ? "ocr_parse_partial" : "ocr_candidate_prefill_failed",
    code: draft.amountMinor ? "receipt_ocr_draft_prefill_ready" : extractionResult.internalCode,
    extractionStatus: extractionResult.status,
    provider: extractionResult.provider,
    importRecordId: upload.importRecordId,
    storagePath: upload.storagePath,
    amountPresent: Boolean(draft.amountMinor),
    currency: draft.currency,
    merchantPresent: Boolean(draft.merchantGuess),
    categoryResolvedIdPresent: Boolean(draft.categoryId),
  });
  console.info("receipt_ocr_stage", {
    stage: "ocr_candidate_prefill_started",
    code: "receipt_ocr_candidate_prefill_started",
    extractionStatus: extractionResult.status,
    provider: extractionResult.provider,
    importRecordId: upload.importRecordId,
    storagePath: upload.storagePath,
    amountPresent: Boolean(draft.amountMinor),
    currency: draft.currency,
    merchantPresent: Boolean(draft.merchantGuess),
    categoryResolvedIdPresent: Boolean(draft.categoryId),
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
      uncertaintyReason: getReceiptOcrReviewMessage(draftOcrStatus),
    },
    {
      getCurrentUser: dependencies.getCurrentUser,
      createImportRecordService: dependencies.createImportRecordService,
      createImportCandidateService: dependencies.createImportCandidateService,
      createCategoryMemoryService: dependencies.createCategoryMemoryService,
    },
  );
  const finalOcrStatus = getReceiptOcrStatus({
    extractionResult,
    amountMinor: draft.amountMinor,
    candidateAmountMinor: candidate?.amountMinor,
  });
  if (dependencies.persistReceiptOcrStatus) {
    await dependencies.persistReceiptOcrStatus({
      userId: user.id,
      importRecordId: upload.importRecordId,
      status: finalOcrStatus,
    });
  }
  console.info("receipt_ocr_stage", {
    stage: candidate?.amountMinor ? "ocr_candidate_prefill_success" : "ocr_candidate_prefill_failed",
    code: candidate?.amountMinor ? "receipt_ocr_candidate_prefilled" : "receipt_ocr_candidate_manual_fallback",
    extractionStatus: extractionResult.status,
    provider: extractionResult.provider,
    importRecordId: upload.importRecordId,
    importCandidateId: candidate?.id ?? null,
    storagePath: upload.storagePath,
    amountPresent: Boolean(candidate?.amountMinor),
    currency: candidate?.currency ?? null,
    merchantPresent: Boolean(candidate?.merchantGuess),
    categoryResolvedIdPresent: Boolean(candidate?.categoryId),
    ocrStatus: finalOcrStatus,
  });

  return {
    upload,
    candidate,
  };
}
