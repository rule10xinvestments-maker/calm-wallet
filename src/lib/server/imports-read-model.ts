import { createSupabaseServerClient } from "@/lib/auth/server-client";
import type { ImportCandidate, ImportRecord } from "@/domain/imports/types";

export type StagedImportCandidateItem = {
  id: string;
  reviewState: ImportCandidate["reviewState"];
  acceptanceState: ImportCandidate["acceptanceState"];
  transactionType: ImportCandidate["transactionType"];
  amountMinor: number | null;
  currency: string | null;
  occurredAt: string | null;
  description: string | null;
  merchantGuess: string | null;
  confidenceScore: number | null;
  uncertaintyReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StagedImportBundle = {
  importRecord: {
    id: string;
    importType: ImportRecord["importType"];
    originalFilename: string;
    mimeType: string;
    status: ImportRecord["status"];
    parseQuality: ImportRecord["parseQuality"];
    failureReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  candidates: StagedImportCandidateItem[];
};

export type ImportsReadModelAdapter = {
  getImportRecordById(userId: string, importRecordId: string): Promise<ImportRecord | null>;
  listImportCandidatesForRecord(userId: string, importRecordId: string): Promise<ImportCandidate[]>;
};

export function mapImportCandidateToReadItem(candidate: ImportCandidate): StagedImportCandidateItem {
  return {
    id: candidate.id,
    reviewState: candidate.reviewState,
    acceptanceState: candidate.acceptanceState,
    transactionType: candidate.transactionType,
    amountMinor: candidate.amountMinor,
    currency: candidate.currency,
    occurredAt: candidate.occurredAt,
    description: candidate.description,
    merchantGuess: candidate.merchantGuess,
    confidenceScore: candidate.confidenceScore,
    uncertaintyReason: candidate.uncertaintyReason,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

export function mapImportBundle(args: {
  importRecord: ImportRecord;
  candidates: ImportCandidate[];
}): StagedImportBundle {
  return {
    importRecord: {
      id: args.importRecord.id,
      importType: args.importRecord.importType,
      originalFilename: args.importRecord.originalFilename,
      mimeType: args.importRecord.mimeType,
      status: args.importRecord.status,
      parseQuality: args.importRecord.parseQuality,
      failureReason: args.importRecord.failureReason,
      createdAt: args.importRecord.createdAt,
      updatedAt: args.importRecord.updatedAt,
    },
    candidates: args.candidates.map(mapImportCandidateToReadItem),
  };
}

export async function getOwnedStagedImportBundle(
  adapter: ImportsReadModelAdapter,
  args: {
    userId: string;
    importRecordId: string;
  },
): Promise<StagedImportBundle | null> {
  const importRecord = await adapter.getImportRecordById(args.userId, args.importRecordId);

  if (!importRecord) {
    return null;
  }

  const candidates = await adapter.listImportCandidatesForRecord(args.userId, args.importRecordId);
  return mapImportBundle({ importRecord, candidates });
}

export async function createSupabaseImportsReadModelAdapter(): Promise<ImportsReadModelAdapter> {
  const supabase = await createSupabaseServerClient();

  return {
    async getImportRecordById(userId, importRecordId) {
      const { data } = await supabase
        .from("import_records")
        .select("*")
        .eq("user_id", userId)
        .eq("id", importRecordId)
        .single();

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        importType: data.import_type,
        storagePath: data.storage_path,
        originalFilename: data.original_filename,
        mimeType: data.mime_type,
        status: data.status,
        parseQuality: data.parse_quality,
        failureReason: data.failure_reason,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    },

    async listImportCandidatesForRecord(userId, importRecordId) {
      const { data } = await supabase
        .from("import_candidates")
        .select("*")
        .eq("user_id", userId)
        .eq("import_record_id", importRecordId)
        .order("created_at", { ascending: true });

      return (data ?? []).map((candidate) => ({
        id: candidate.id,
        userId: candidate.user_id,
        importRecordId: candidate.import_record_id,
        transactionType: candidate.transaction_type,
        amountMinor: candidate.amount_minor,
        currency: candidate.currency,
        occurredAt: candidate.occurred_at,
        description: candidate.description,
        merchantGuess: candidate.merchant_guess,
        categoryId: candidate.category_id,
        confidenceScore: candidate.confidence_score,
        reviewState: candidate.review_state,
        acceptanceState: candidate.acceptance_state,
        acceptedTransactionId: candidate.accepted_transaction_id,
        uncertaintyReason: candidate.uncertainty_reason,
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at,
      }));
    },
  };
}

export async function loadOwnedStagedImportBundle(args: {
  userId: string;
  importRecordId: string;
}): Promise<StagedImportBundle | null> {
  const adapter = await createSupabaseImportsReadModelAdapter();
  return getOwnedStagedImportBundle(adapter, args);
}
