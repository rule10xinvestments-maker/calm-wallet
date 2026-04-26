import { getCurrentUser } from "@/lib/auth/session";
import {
  loadOwnedStagedImportBundle,
  type StagedImportBundle,
} from "@/lib/server/imports-read-model";

export type StagedImportReviewProgress = {
  importRecordId: string;
  totalCandidateCount: number;
  acceptedCount: number;
  rejectedCount: number;
  pendingCount: number;
};

export type LoadStagedImportReviewProgressDependencies = {
  getCurrentUser: typeof getCurrentUser;
  loadOwnedStagedImportBundle: typeof loadOwnedStagedImportBundle;
};

const defaultDependencies: LoadStagedImportReviewProgressDependencies = {
  getCurrentUser,
  loadOwnedStagedImportBundle,
};

export function mapStagedImportReviewProgress(bundle: StagedImportBundle): StagedImportReviewProgress {
  const acceptedCount = bundle.candidates.filter((candidate) => candidate.acceptanceState === "accepted").length;
  const rejectedCount = bundle.candidates.filter((candidate) => candidate.acceptanceState === "rejected").length;
  const pendingCount = bundle.candidates.filter((candidate) => candidate.acceptanceState === "pending").length;

  return {
    importRecordId: bundle.importRecord.id,
    totalCandidateCount: bundle.candidates.length,
    acceptedCount,
    rejectedCount,
    pendingCount,
  };
}

export async function loadStagedImportReviewProgress(
  importRecordId: string,
  dependencies: LoadStagedImportReviewProgressDependencies = defaultDependencies,
): Promise<StagedImportReviewProgress | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const bundle = await dependencies.loadOwnedStagedImportBundle({
    userId: user.id,
    importRecordId,
  });

  if (!bundle) {
    return null;
  }

  return mapStagedImportReviewProgress(bundle);
}
