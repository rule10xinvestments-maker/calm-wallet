"use client";

import { createSupabaseBrowserClient } from "@/lib/auth/browser-client";
import { IMPORT_STORAGE_BUCKET } from "@/lib/imports/storage";

export type UploadStagedImportFileInput = {
  bucket: typeof IMPORT_STORAGE_BUCKET;
  storagePath: string;
  uploadToken: string;
  file: File;
};

export type UploadStagedImportFileDependencies = {
  createBrowserClient: typeof createSupabaseBrowserClient;
};

const defaultDependencies: UploadStagedImportFileDependencies = {
  createBrowserClient: createSupabaseBrowserClient,
};

export async function uploadStagedImportFile(
  input: UploadStagedImportFileInput,
  dependencies: UploadStagedImportFileDependencies = defaultDependencies,
) {
  const supabase = dependencies.createBrowserClient();
  const result = await supabase.storage
    .from(input.bucket)
    .uploadToSignedUrl(input.storagePath, input.uploadToken, input.file, {
      contentType: input.file.type || "application/octet-stream",
      upsert: false,
    });

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Unable to upload staged import file.");
  }

  return result.data;
}
