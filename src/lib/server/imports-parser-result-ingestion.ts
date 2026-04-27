import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import { ingestImportParserResultSchema, parserResultCandidateSchema } from "@/domain/imports/schemas";
import type { CreateImportCandidateInput, ImportCandidate, ImportRecordType, IngestImportParserResultInput } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type IngestImportParserResultDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById" | "updateImportRecordStatus">>;
  createImportCandidateService: () => Promise<
    Pick<ImportCandidateService, "createImportCandidate" | "listImportCandidates">
  >;
};

export type IngestImportParserResultResult = {
  importRecordId: string;
  importType: ImportRecordType;
  status: "parsed" | "failed";
  candidatesCreated: number;
  candidates: ImportCandidate[];
  skippedInvalidRowCount: number;
  skippedInvalidRowSummary: string | null;
};

type NormalizedParserCandidate = Omit<CreateImportCandidateInput, "importRecordId"> &
  Required<Pick<CreateImportCandidateInput, "transactionType" | "amountMinor" | "currency" | "occurredAt" | "reviewState" | "acceptanceState">>;

const defaultDependencies: IngestImportParserResultDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: createSupabaseImportCandidateService,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
}

function buildSkippedInvalidRowSummary(count: number) {
  if (count === 0) {
    return null;
  }

  return `${count} parser row${count === 1 ? " was" : "s were"} skipped because required transaction fields were missing or invalid.`;
}

function toSafeFailureReason(skippedInvalidRowCount: number) {
  if (skippedInvalidRowCount > 0) {
    return "No valid parser rows were found.";
  }

  return "Parser result did not contain reviewable rows.";
}

function normalizeParserCandidate(input: unknown): NormalizedParserCandidate | null {
  const parsed = parserResultCandidateSchema.safeParse(input);

  if (!parsed.success) {
    return null;
  }

  return {
    transactionType: parsed.data.transactionType,
    amountMinor: parsed.data.amountMinor,
    currency: parsed.data.currency,
    occurredAt: parsed.data.occurredAt,
    description: parsed.data.description ?? null,
    merchantGuess: parsed.data.merchantGuess ?? null,
    confidenceScore: parsed.data.confidenceScore ?? null,
    uncertaintyReason: parsed.data.uncertaintyReason ?? null,
    reviewState: "pending_review",
    acceptanceState: "pending",
  };
}

function toCandidateSignature(
  candidate: Pick<
    ImportCandidate,
    | "transactionType"
    | "amountMinor"
    | "currency"
    | "occurredAt"
    | "description"
    | "merchantGuess"
    | "confidenceScore"
    | "reviewState"
    | "acceptanceState"
    | "uncertaintyReason"
  >,
): string {
  return JSON.stringify([
    candidate.transactionType ?? null,
    candidate.amountMinor ?? null,
    candidate.currency ?? null,
    candidate.occurredAt ?? null,
    candidate.description ?? null,
    candidate.merchantGuess ?? null,
    candidate.confidenceScore ?? null,
    candidate.reviewState,
    candidate.acceptanceState,
    candidate.uncertaintyReason ?? null,
  ]);
}

export async function ingestImportParserResult(
  input: IngestImportParserResultInput,
  dependencies: IngestImportParserResultDependencies = defaultDependencies,
): Promise<IngestImportParserResultResult | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const parsed = ingestImportParserResultSchema.parse(input);
  const importRecordService = await dependencies.createImportRecordService();
  let importRecord;

  try {
    importRecord = await importRecordService.getImportRecordById(user.id, parsed.importRecordId);
  } catch (error) {
    if (error instanceof Error && error.message === "Import record not found.") {
      return null;
    }

    throw error;
  }

  if (!isSupportedImportType(importRecord.importType)) {
    throw new Error("Unsupported import type.");
  }

  if (importRecord.status !== "parsing") {
    throw new Error("Only parsing import records can ingest parser results.");
  }

  const importCandidateService = await dependencies.createImportCandidateService();
  const existingCandidates = await importCandidateService.listImportCandidates(user.id, {
    importRecordId: parsed.importRecordId,
  });
  const candidatesBySignature = new Map(existingCandidates.map((candidate) => [toCandidateSignature(candidate), candidate]));
  const candidates: ImportCandidate[] = [];
  let candidatesCreated = 0;
  let skippedInvalidRowCount = 0;

  for (const rawCandidate of parsed.candidates) {
    const candidate = normalizeParserCandidate(rawCandidate);

    if (!candidate) {
      skippedInvalidRowCount += 1;
      continue;
    }

    const signature = toCandidateSignature({
      transactionType: candidate.transactionType,
      amountMinor: candidate.amountMinor,
      currency: candidate.currency,
      occurredAt: candidate.occurredAt,
      description: candidate.description ?? null,
      merchantGuess: candidate.merchantGuess ?? null,
      confidenceScore: candidate.confidenceScore ?? null,
      reviewState: candidate.reviewState,
      acceptanceState: candidate.acceptanceState,
      uncertaintyReason: candidate.uncertaintyReason ?? null,
    });
    const existingCandidate = candidatesBySignature.get(signature);

    if (existingCandidate) {
      candidates.push(existingCandidate);
      continue;
    }

    const createdCandidate = await importCandidateService.createImportCandidate(user.id, {
        importRecordId: parsed.importRecordId,
        ...candidate,
      });

    candidatesBySignature.set(signature, createdCandidate);
    candidates.push(createdCandidate);
    candidatesCreated += 1;
  }

  const skippedInvalidRowSummary = buildSkippedInvalidRowSummary(skippedInvalidRowCount);

  if (candidates.length === 0) {
    await importRecordService.updateImportRecordStatus(user.id, parsed.importRecordId, {
      status: "failed",
      parseQuality: "low",
      failureReason: toSafeFailureReason(skippedInvalidRowCount),
    });

    return {
      importRecordId: importRecord.id,
      importType: importRecord.importType,
      status: "failed",
      candidatesCreated,
      candidates,
      skippedInvalidRowCount,
      skippedInvalidRowSummary,
    };
  }

  await importRecordService.updateImportRecordStatus(user.id, parsed.importRecordId, {
    status: "parsed",
    parseQuality: importRecord.parseQuality,
    failureReason: null,
  });

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    status: "parsed",
    candidatesCreated,
    candidates,
    skippedInvalidRowCount,
    skippedInvalidRowSummary,
  };
}
