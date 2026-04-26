import { getCurrentUser } from "@/lib/auth/session";
import {
  loadOwnedStagedImportBundle,
  type StagedImportBundle,
} from "@/lib/server/imports-read-model";

export type AuthenticatedImportsLoaderDependencies = {
  getCurrentUser: typeof getCurrentUser;
  loadOwnedStagedImportBundle: typeof loadOwnedStagedImportBundle;
};

const defaultDependencies: AuthenticatedImportsLoaderDependencies = {
  getCurrentUser,
  loadOwnedStagedImportBundle,
};

export async function loadAuthenticatedStagedImportBundle(
  importRecordId: string,
  dependencies: AuthenticatedImportsLoaderDependencies = defaultDependencies,
): Promise<StagedImportBundle | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  return dependencies.loadOwnedStagedImportBundle({
    userId: user.id,
    importRecordId,
  });
}
