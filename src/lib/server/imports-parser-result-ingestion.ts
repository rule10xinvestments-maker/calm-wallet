import {
  createSupabaseImportCandidateService,
  createSupabaseImportRecordService,
  type ImportCandidateService,
  type ImportRecordService,
} from "@/domain/imports/service";
import { ingestImportParserResultSchema } from "@/domain/imports/schemas";
import type {
  ImportCandidate,
  ImportRecordType,
  IngestImportParserResultInput,
} from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";
import { SUPPORTED_IMPORT_TYPES } from "@/lib/imports/storage";

export type IngestImportParserResultDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "getImportRecordById">>;
  createImportCandidateService: () => Promise<
    Pick<ImportCandidateService, "createImportCandidate" | "listImportCandidates">
  >;
};

export type IngestImportParserResultResult = {
  importRecordId: string;
  importType: ImportRecordType;
  candidatesCreated: number;
  candidates: ImportCandidate[];
};

const defaultDependencies: IngestImportParserResultDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
  createImportCandidateService: createSupabaseImportCandidateService,
};

function isSupportedImportType(value: string): value is ImportRecordType {
  return SUPPORTED_IMPORT_TYPES.includes(value as ImportRecordType);
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

  const importCandidateService = await dependencies.createImportCandidateService();
  const existingCandidates = await importCandidateService.listImportCandidates(user.id, {
    importRecordId: parsed.importRecordId,
  });
  const candidatesBySignature = new Map(existingCandidates.map((candidate) => [toCandidateSignature(candidate), candidate]));
  const candidates: ImportCandidate[] = [];
  let candidatesCreated = 0;

  for (const candidate of parsed.candidates) {
    const signature = toCandidateSignature({
      transactionType: candidate.transactionType ?? null,
      amountMinor: candidate.amountMinor ?? null,
      currency: candidate.currency ?? null,
      occurredAt: candidate.occurredAt ?? null,
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

  return {
    importRecordId: importRecord.id,
    importType: importRecord.importType,
    candidatesCreated,
    candidates,
  };
}
