import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  completeImportRecordUploadSchema,
  createImportCandidateSchema,
  createImportRecordSchema,
  getImportCandidateSchema,
  getImportRecordSchema,
  listImportCandidatesSchema,
  listImportRecordsSchema,
  updateImportCandidateStatusSchema,
  updateImportRecordStatusSchema,
} from "@/domain/imports/schemas";
import {
  DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE,
  DEFAULT_IMPORT_PARSE_QUALITY,
  type CompleteImportRecordUploadInput,
  type CreateImportCandidateInput,
  type CreateImportRecordInput,
  type ImportCandidate,
  type ImportCandidateInsertRow,
  type ImportCandidateRow,
  type ImportCandidateUpdateRow,
  type ImportRecord,
  type ImportRecordInsertRow,
  type ImportRecordRow,
  type ImportRecordUpdateRow,
  type ListImportCandidatesFilters,
  type ListImportRecordsFilters,
  type UpdateImportCandidateStatusInput,
  type UpdateImportRecordStatusInput,
} from "@/domain/imports/types";

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

export type ImportRecordServiceAdapter = {
  insertImportRecord(row: ImportRecordInsertRow): QueryResult<ImportRecordRow>;
  getImportRecordById(userId: string, importRecordId: string): QueryResult<ImportRecordRow>;
  listImportRecords(userId: string, filters: ListImportRecordsFilters): QueryResult<ImportRecordRow[]>;
  updateImportRecord(
    userId: string,
    importRecordId: string,
    updates: ImportRecordUpdateRow,
  ): QueryResult<ImportRecordRow>;
};

export type ImportRecordService = ReturnType<typeof createImportRecordService>;
export type ImportCandidateServiceAdapter = {
  insertImportCandidate(row: ImportCandidateInsertRow): QueryResult<ImportCandidateRow>;
  getImportCandidateById(userId: string, importCandidateId: string): QueryResult<ImportCandidateRow>;
  listImportCandidates(userId: string, filters: ListImportCandidatesFilters): QueryResult<ImportCandidateRow[]>;
  updateImportCandidate(
    userId: string,
    importCandidateId: string,
    updates: ImportCandidateUpdateRow,
  ): QueryResult<ImportCandidateRow>;
  getImportRecordById(userId: string, importRecordId: string): QueryResult<ImportRecordRow>;
};
export type ImportCandidateService = ReturnType<typeof createImportCandidateService>;

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message);
  }

  if (result.data === null) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function mapImportRecordRowToDomain(row: ImportRecordRow): ImportRecord {
  return {
    id: row.id,
    userId: row.user_id,
    importType: row.import_type,
    storagePath: row.storage_path,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    status: row.status,
    parseQuality: row.parse_quality,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapImportCandidateRowToDomain(row: ImportCandidateRow): ImportCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    importRecordId: row.import_record_id,
    transactionType: row.transaction_type,
    amountMinor: row.amount_minor,
    currency: row.currency,
    occurredAt: row.occurred_at,
    description: row.description,
    merchantGuess: row.merchant_guess,
    categoryId: row.category_id,
    confidenceScore: row.confidence_score,
    reviewState: row.review_state,
    acceptanceState: row.acceptance_state,
    acceptedTransactionId: row.accepted_transaction_id,
    uncertaintyReason: row.uncertainty_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFailureReason(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function createImportRecordService(adapter: ImportRecordServiceAdapter) {
  return {
    async createImportRecord(userId: string, input: CreateImportRecordInput): Promise<ImportRecord> {
      const parsed = createImportRecordSchema.parse(input);

      const row = assertResult(
        await adapter.insertImportRecord({
          user_id: userId,
          import_type: parsed.importType,
          storage_path: parsed.storagePath,
          original_filename: parsed.originalFilename,
          mime_type: parsed.mimeType,
          status: parsed.status,
          parse_quality: DEFAULT_IMPORT_PARSE_QUALITY,
          failure_reason: null,
        }),
        "Unable to create import record.",
      );

      return mapImportRecordRowToDomain(row);
    },

    async getImportRecordById(userId: string, importRecordId: string): Promise<ImportRecord> {
      const parsed = getImportRecordSchema.parse({ importRecordId });
      const row = assertResult(
        await adapter.getImportRecordById(userId, parsed.importRecordId),
        "Import record not found.",
      );

      return mapImportRecordRowToDomain(row);
    },

    async listImportRecords(userId: string, filters: ListImportRecordsFilters = {}): Promise<ImportRecord[]> {
      const parsed = listImportRecordsSchema.parse(filters);
      const rows = assertResult(await adapter.listImportRecords(userId, parsed), "Unable to list import records.");
      return rows.map(mapImportRecordRowToDomain);
    },

    async updateImportRecordStatus(
      userId: string,
      importRecordId: string,
      input: UpdateImportRecordStatusInput,
    ): Promise<ImportRecord> {
      const parsed = updateImportRecordStatusSchema.parse({
        importRecordId,
        ...input,
      });

      const existing = await adapter.getImportRecordById(userId, parsed.importRecordId);
      assertResult(existing, "Import record not found.");

      const failureReason = parsed.status === "failed" ? normalizeFailureReason(parsed.failureReason) : null;
      const row = assertResult(
        await adapter.updateImportRecord(userId, parsed.importRecordId, {
          status: parsed.status,
          parse_quality: parsed.parseQuality,
          failure_reason: failureReason,
        }),
        "Unable to update import record.",
      );

      return mapImportRecordRowToDomain(row);
    },

    async completeImportRecordUpload(
      userId: string,
      importRecordId: string,
      input: CompleteImportRecordUploadInput,
    ): Promise<ImportRecord> {
      const parsed = completeImportRecordUploadSchema.parse({
        importRecordId,
        ...input,
      });

      const existing = await adapter.getImportRecordById(userId, parsed.importRecordId);
      assertResult(existing, "Import record not found.");

      const row = assertResult(
        await adapter.updateImportRecord(userId, parsed.importRecordId, {
          storage_path: parsed.storagePath,
          original_filename: parsed.originalFilename,
          mime_type: parsed.mimeType,
          status: parsed.status,
        }),
        "Unable to persist upload completion metadata.",
      );

      return mapImportRecordRowToDomain(row);
    },
  };
}

export function createImportCandidateService(adapter: ImportCandidateServiceAdapter) {
  return {
    async createImportCandidate(userId: string, input: CreateImportCandidateInput): Promise<ImportCandidate> {
      const parsed = createImportCandidateSchema.parse(input);
      const ownedImportRecord = await adapter.getImportRecordById(userId, parsed.importRecordId);
      assertResult(ownedImportRecord, "Import record not found.");

      const row = assertResult(
        await adapter.insertImportCandidate({
          user_id: userId,
          import_record_id: parsed.importRecordId,
          transaction_type: parsed.transactionType ?? null,
          amount_minor: parsed.amountMinor ?? null,
          currency: parsed.currency ?? null,
          occurred_at: parsed.occurredAt ?? null,
          description: normalizeOptionalText(parsed.description),
          merchant_guess: normalizeOptionalText(parsed.merchantGuess),
          confidence_score: parsed.confidenceScore ?? null,
          review_state: parsed.reviewState,
          acceptance_state: parsed.acceptanceState,
          uncertainty_reason: normalizeOptionalText(parsed.uncertaintyReason) ?? null,
        }),
        "Unable to create import candidate.",
      );

      return mapImportCandidateRowToDomain(row);
    },

    async getImportCandidateById(userId: string, importCandidateId: string): Promise<ImportCandidate> {
      const parsed = getImportCandidateSchema.parse({ importCandidateId });
      const row = assertResult(
        await adapter.getImportCandidateById(userId, parsed.importCandidateId),
        "Import candidate not found.",
      );

      return mapImportCandidateRowToDomain(row);
    },

    async listImportCandidates(userId: string, filters: ListImportCandidatesFilters): Promise<ImportCandidate[]> {
      const parsed = listImportCandidatesSchema.parse(filters);
      const ownedImportRecord = await adapter.getImportRecordById(userId, parsed.importRecordId);
      assertResult(ownedImportRecord, "Import record not found.");

      const rows = assertResult(
        await adapter.listImportCandidates(userId, parsed),
        "Unable to list import candidates.",
      );
      return rows.map(mapImportCandidateRowToDomain);
    },

    async updateImportCandidateStatus(
      userId: string,
      importCandidateId: string,
      input: UpdateImportCandidateStatusInput,
    ): Promise<ImportCandidate> {
      const parsed = updateImportCandidateStatusSchema.parse({
        importCandidateId,
        ...input,
      });

      const existing = await adapter.getImportCandidateById(userId, parsed.importCandidateId);
      assertResult(existing, "Import candidate not found.");

      const uncertaintyReason =
        parsed.reviewState === "needs_attention" ? normalizeOptionalText(parsed.uncertaintyReason) : null;
      const row = assertResult(
        await adapter.updateImportCandidate(userId, parsed.importCandidateId, {
          review_state: parsed.reviewState,
          acceptance_state: parsed.acceptanceState ?? DEFAULT_IMPORT_CANDIDATE_ACCEPTANCE_STATE,
          accepted_transaction_id:
            parsed.acceptanceState === "accepted" ? parsed.acceptedTransactionId ?? null : null,
          uncertainty_reason: uncertaintyReason,
        }),
        "Unable to update import candidate.",
      );

      return mapImportCandidateRowToDomain(row);
    },
  };
}

export async function createSupabaseImportRecordService() {
  const supabase = await createSupabaseServerClient();

  const adapter: ImportRecordServiceAdapter = {
    async insertImportRecord(row) {
      return supabase.from("import_records").insert(row).select("*").single();
    },

    async getImportRecordById(userId, importRecordId) {
      return supabase.from("import_records").select("*").eq("user_id", userId).eq("id", importRecordId).single();
    },

    async listImportRecords(userId, filters) {
      let query = supabase
        .from("import_records")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      return query;
    },

    async updateImportRecord(userId, importRecordId, updates) {
      return supabase
        .from("import_records")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", importRecordId)
        .select("*")
        .single();
    },
  };

  return createImportRecordService(adapter);
}

export async function createSupabaseImportCandidateService() {
  const supabase = await createSupabaseServerClient();

  const adapter: ImportCandidateServiceAdapter = {
    async insertImportCandidate(row) {
      return supabase.from("import_candidates").insert(row).select("*").single();
    },

    async getImportCandidateById(userId, importCandidateId) {
      return supabase.from("import_candidates").select("*").eq("user_id", userId).eq("id", importCandidateId).single();
    },

    async listImportCandidates(userId, filters) {
      let query = supabase
        .from("import_candidates")
        .select("*")
        .eq("user_id", userId)
        .eq("import_record_id", filters.importRecordId)
        .order("created_at", { ascending: false });

      if (filters.reviewState) {
        query = query.eq("review_state", filters.reviewState);
      }

      if (filters.acceptanceState) {
        query = query.eq("acceptance_state", filters.acceptanceState);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      return query;
    },

    async updateImportCandidate(userId, importCandidateId, updates) {
      return supabase
        .from("import_candidates")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", importCandidateId)
        .select("*")
        .single();
    },

    async getImportRecordById(userId, importRecordId) {
      return supabase.from("import_records").select("*").eq("user_id", userId).eq("id", importRecordId).single();
    },
  };

  return createImportCandidateService(adapter);
}
