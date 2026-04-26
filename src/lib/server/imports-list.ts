import { createSupabaseImportRecordService, type ImportRecordService } from "@/domain/imports/service";
import type { ImportRecordStatus } from "@/domain/imports/types";
import { getCurrentUser } from "@/lib/auth/session";

export type StagedImportListItem = {
  importRecordId: string;
  importType: "receipt_image" | "csv_import";
  originalFilename: string;
  mimeType: string;
  status: ImportRecordStatus;
  parseQuality: "unknown" | "low" | "medium" | "high";
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoadStagedImportListInput = {
  status?: ImportRecordStatus;
};

export type LoadStagedImportListDependencies = {
  getCurrentUser: typeof getCurrentUser;
  createImportRecordService: () => Promise<Pick<ImportRecordService, "listImportRecords">>;
};

const defaultDependencies: LoadStagedImportListDependencies = {
  getCurrentUser,
  createImportRecordService: createSupabaseImportRecordService,
};

function mapImportRecordToListItem(record: Awaited<ReturnType<ImportRecordService["listImportRecords"]>>[number]): StagedImportListItem {
  return {
    importRecordId: record.id,
    importType: record.importType,
    originalFilename: record.originalFilename,
    mimeType: record.mimeType,
    status: record.status,
    parseQuality: record.parseQuality,
    failureReason: record.failureReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function loadStagedImportList(
  input: LoadStagedImportListInput = {},
  dependencies: LoadStagedImportListDependencies = defaultDependencies,
): Promise<StagedImportListItem[] | null> {
  const user = await dependencies.getCurrentUser();

  if (!user) {
    return null;
  }

  const importRecordService = await dependencies.createImportRecordService();
  const records = await importRecordService.listImportRecords(user.id, {
    ...(input.status ? { status: input.status } : {}),
  });

  return records.map(mapImportRecordToListItem);
}
