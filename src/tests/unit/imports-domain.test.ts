import { describe, expect, it, vi } from "vitest";
import {
  completeImportRecordUploadSchema,
  createImportCandidateSchema,
  createImportRecordSchema,
  listImportCandidatesSchema,
  listImportRecordsSchema,
  updateImportCandidateStatusSchema,
  updateImportRecordStatusSchema,
} from "@/domain/imports/schemas";
import {
  createImportCandidateService,
  createImportRecordService,
  type ImportCandidateServiceAdapter,
  type ImportRecordServiceAdapter,
} from "@/domain/imports/service";
import type { ImportCandidateRow, ImportRecordRow } from "@/domain/imports/types";

function makeImportRecordRow(overrides: Partial<ImportRecordRow> = {}): ImportRecordRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    import_type: "receipt_image",
    storage_path: "imports/22222222-2222-2222-2222-222222222222/receipt_image/2026/04/upload.jpg",
    original_filename: "receipt.jpg",
    mime_type: "image/jpeg",
    status: "uploaded",
    parse_quality: "unknown",
    failure_reason: null,
    created_at: "2026-04-21T10:00:00.000Z",
    updated_at: "2026-04-21T10:00:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<ImportRecordServiceAdapter> = {}): ImportRecordServiceAdapter {
  return {
    insertImportRecord: vi.fn(async (row) => ({
      data: makeImportRecordRow(row),
      error: null,
    })),
    getImportRecordById: vi.fn(async (_userId, importRecordId) => ({
      data: makeImportRecordRow({ id: importRecordId }),
      error: null,
    })),
    listImportRecords: vi.fn(async () => ({
      data: [makeImportRecordRow()],
      error: null,
    })),
    updateImportRecord: vi.fn(async (_userId, importRecordId, updates) => ({
      data: makeImportRecordRow({
        id: importRecordId,
        status: updates.status ?? "uploaded",
        parse_quality: updates.parse_quality ?? "unknown",
        failure_reason: updates.failure_reason === undefined ? null : updates.failure_reason,
      }),
      error: null,
    })),
    ...overrides,
  };
}

function makeImportCandidateRow(overrides: Partial<ImportCandidateRow> = {}): ImportCandidateRow {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    user_id: "22222222-2222-2222-2222-222222222222",
    import_record_id: "11111111-1111-1111-1111-111111111111",
    transaction_type: "expense",
    amount_minor: 1250,
    currency: "USD",
    occurred_at: "2026-04-21T10:00:00.000Z",
    description: "Coffee shop",
    merchant_guess: "Corner Cafe",
    category_id: null,
    confidence_score: 0.82,
    review_state: "pending_review",
    acceptance_state: "pending",
    accepted_transaction_id: null,
    uncertainty_reason: null,
    created_at: "2026-04-21T10:05:00.000Z",
    updated_at: "2026-04-21T10:05:00.000Z",
    ...overrides,
  };
}

function makeCandidateAdapter(overrides: Partial<ImportCandidateServiceAdapter> = {}): ImportCandidateServiceAdapter {
  return {
    insertImportCandidate: vi.fn(async (row) => ({
      data: makeImportCandidateRow(row),
      error: null,
    })),
    getImportCandidateById: vi.fn(async (_userId, importCandidateId) => ({
      data: makeImportCandidateRow({ id: importCandidateId }),
      error: null,
    })),
    listImportCandidates: vi.fn(async () => ({
      data: [makeImportCandidateRow()],
      error: null,
    })),
    updateImportCandidate: vi.fn(async (_userId, importCandidateId, updates) => ({
      data: makeImportCandidateRow({
        id: importCandidateId,
        review_state: updates.review_state ?? "pending_review",
        acceptance_state: updates.acceptance_state ?? "pending",
        uncertainty_reason: updates.uncertainty_reason === undefined ? null : updates.uncertainty_reason,
      }),
      error: null,
    })),
    getImportRecordById: vi.fn(async (_userId, importRecordId) => ({
      data: makeImportRecordRow({ id: importRecordId }),
      error: null,
    })),
    ...overrides,
  };
}

describe("import schemas", () => {
  it("accepts the supported import types only", () => {
    const csvResult = createImportRecordSchema.parse({
      importType: "csv_import",
      storagePath: "imports/user/csv_import/2026/04/file.csv",
      originalFilename: "file.csv",
      mimeType: "text/csv",
    });

    expect(csvResult.importType).toBe("csv_import");
  });

  it("rejects unsupported import types", () => {
    expect(() =>
      createImportRecordSchema.parse({
        importType: "pdf_import",
        storagePath: "imports/user/pdf_import/2026/04/file.pdf",
        originalFilename: "file.pdf",
        mimeType: "application/pdf",
      }),
    ).toThrow();
  });

  it("requires a failure reason when status is failed", () => {
    expect(() =>
      updateImportRecordStatusSchema.parse({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        status: "failed",
      }),
    ).toThrow("A failure reason is required when an import fails.");
  });

  it("keeps list filters narrow", () => {
    const result = listImportRecordsSchema.parse({
      status: "uploaded",
      limit: 10,
    });

    expect(result.limit).toBe(10);
  });

  it("only allows uploaded status for upload completion metadata", () => {
    expect(() =>
      completeImportRecordUploadSchema.parse({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        storagePath: "imports/user/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "parsed",
      }),
    ).toThrow();
  });

  it("accepts candidate creation with explicit review defaults", () => {
    const result = createImportCandidateSchema.parse({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      description: "Coffee shop",
    });

    expect(result.reviewState).toBe("pending_review");
    expect(result.acceptanceState).toBe("pending");
  });

  it("rejects unsupported candidate status values", () => {
    expect(() =>
      updateImportCandidateStatusSchema.parse({
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        reviewState: "uploaded",
      }),
    ).toThrow();
  });

  it("requires an accepted transaction id when a candidate is accepted", () => {
    expect(() =>
      updateImportCandidateStatusSchema.parse({
        importCandidateId: "33333333-3333-3333-3333-333333333333",
        reviewState: "reviewed",
        acceptanceState: "accepted",
      }),
    ).toThrow("An accepted transaction identifier is required when a candidate is accepted.");
  });

  it("keeps candidate list filters narrow", () => {
    const result = listImportCandidatesSchema.parse({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      reviewState: "pending_review",
      acceptanceState: "pending",
      limit: 5,
    });

    expect(result.limit).toBe(5);
  });
});

describe("import record service", () => {
  it("creates a staged import record with explicit ownership", async () => {
    const insertImportRecord = vi.fn(async (row) => ({
      data: makeImportRecordRow(row),
      error: null,
    }));
    const adapter = makeAdapter({ insertImportRecord });
    const service = createImportRecordService(adapter);

    const result = await service.createImportRecord("22222222-2222-2222-2222-222222222222", {
      importType: "receipt_image",
      storagePath: "imports/22222222-2222-2222-2222-222222222222/receipt_image/2026/04/upload.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.userId).toBe("22222222-2222-2222-2222-222222222222");
    expect(insertImportRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "22222222-2222-2222-2222-222222222222",
        status: "uploaded",
        parse_quality: "unknown",
      }),
    );
  });

  it("protects ownership when a user-owned read misses", async () => {
    const adapter = makeAdapter({
      getImportRecordById: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createImportRecordService(adapter);

    await expect(
      service.getImportRecordById("other-user", "11111111-1111-1111-1111-111111111111"),
    ).rejects.toThrow("Import record not found.");
  });

  it("updates status with explicit allowed values", async () => {
    const updateImportRecord = vi.fn(async (_userId, importRecordId, updates) => ({
      data: makeImportRecordRow({
        id: importRecordId,
        status: updates.status ?? "uploaded",
        parse_quality: updates.parse_quality ?? "unknown",
        failure_reason: updates.failure_reason === undefined ? null : updates.failure_reason,
      }),
      error: null,
    }));
    const adapter = makeAdapter({ updateImportRecord });
    const service = createImportRecordService(adapter);

    const result = await service.updateImportRecordStatus(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      {
        status: "failed",
        parseQuality: "low",
        failureReason: "File contents could not be parsed.",
      },
    );

    expect(result.status).toBe("failed");
    expect(result.failureReason).toBe("File contents could not be parsed.");
    expect(updateImportRecord).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        status: "failed",
        parse_quality: "low",
        failure_reason: "File contents could not be parsed.",
      }),
    );
  });

  it("clears failure reason when moving to a non-failed status", async () => {
    const updateImportRecord = vi.fn(async (_userId, importRecordId, updates) => ({
      data: makeImportRecordRow({
        id: importRecordId,
        status: updates.status ?? "uploaded",
        parse_quality: updates.parse_quality ?? "unknown",
        failure_reason: updates.failure_reason === undefined ? "Previous failure" : updates.failure_reason,
      }),
      error: null,
    }));
    const adapter = makeAdapter({ updateImportRecord });
    const service = createImportRecordService(adapter);

    const result = await service.updateImportRecordStatus(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      {
        status: "parsed",
        parseQuality: "medium",
        failureReason: "Should be cleared",
      },
    );

    expect(result.status).toBe("parsed");
    expect(result.failureReason).toBeNull();
    expect(updateImportRecord).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        status: "parsed",
        parse_quality: "medium",
        failure_reason: null,
      }),
    );
  });

  it("persists upload completion metadata for an owned import record", async () => {
    const updateImportRecord = vi.fn(async (_userId, importRecordId, updates) => ({
      data: makeImportRecordRow({
        id: importRecordId,
        storage_path: updates.storage_path ?? "imports/default/path",
        original_filename: updates.original_filename ?? "receipt.jpg",
        mime_type: updates.mime_type ?? "image/jpeg",
        status: updates.status ?? "uploaded",
      }),
      error: null,
    }));
    const adapter = makeAdapter({ updateImportRecord });
    const service = createImportRecordService(adapter);

    const result = await service.completeImportRecordUpload(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      {
        storagePath: "imports/user/receipt_image/2026/04/receipt.jpg",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
      },
    );

    expect(result.storagePath).toBe("imports/user/receipt_image/2026/04/receipt.jpg");
    expect(updateImportRecord).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "11111111-1111-1111-1111-111111111111",
      expect.objectContaining({
        storage_path: "imports/user/receipt_image/2026/04/receipt.jpg",
        original_filename: "receipt.jpg",
        mime_type: "image/jpeg",
        status: "uploaded",
      }),
    );
  });
});

describe("import candidate service", () => {
  it("creates a candidate for a user-owned import record", async () => {
    const insertImportCandidate = vi.fn(async (row) => ({
      data: makeImportCandidateRow(row),
      error: null,
    }));
    const adapter = makeCandidateAdapter({ insertImportCandidate });
    const service = createImportCandidateService(adapter);

    const result = await service.createImportCandidate("22222222-2222-2222-2222-222222222222", {
      importRecordId: "11111111-1111-1111-1111-111111111111",
      description: "Coffee shop",
      merchantGuess: "Corner Cafe",
      amountMinor: 1250,
      currency: "USD",
      transactionType: "expense",
    });

    expect(result.importRecordId).toBe("11111111-1111-1111-1111-111111111111");
    expect(insertImportCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "22222222-2222-2222-2222-222222222222",
        import_record_id: "11111111-1111-1111-1111-111111111111",
        review_state: "pending_review",
        acceptance_state: "pending",
      }),
    );
  });

  it("rejects candidate creation when the import record is not owned", async () => {
    const adapter = makeCandidateAdapter({
      getImportRecordById: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createImportCandidateService(adapter);

    await expect(
      service.createImportCandidate("other-user", {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        description: "Coffee shop",
      }),
    ).rejects.toThrow("Import record not found.");
  });

  it("protects ownership when a user-owned candidate read misses", async () => {
    const adapter = makeCandidateAdapter({
      getImportCandidateById: vi.fn(async () => ({ data: null, error: null })),
    });
    const service = createImportCandidateService(adapter);

    await expect(
      service.getImportCandidateById("other-user", "33333333-3333-3333-3333-333333333333"),
    ).rejects.toThrow("Import candidate not found.");
  });

  it("lists candidates for an owned import record", async () => {
    const listImportCandidates = vi.fn(async () => ({
      data: [makeImportCandidateRow()],
      error: null,
    }));
    const adapter = makeCandidateAdapter({ listImportCandidates });
    const service = createImportCandidateService(adapter);

    const result = await service.listImportCandidates("22222222-2222-2222-2222-222222222222", {
      importRecordId: "11111111-1111-1111-1111-111111111111",
      reviewState: "pending_review",
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(listImportCandidates).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        reviewState: "pending_review",
        limit: 10,
      }),
    );
  });

  it("updates candidate status with explicit allowed values", async () => {
    const updateImportCandidate = vi.fn(async (_userId, importCandidateId, updates) => ({
      data: makeImportCandidateRow({
        id: importCandidateId,
        review_state: updates.review_state ?? "pending_review",
        acceptance_state: updates.acceptance_state ?? "pending",
        uncertainty_reason: updates.uncertainty_reason === undefined ? null : updates.uncertainty_reason,
      }),
      error: null,
    }));
    const adapter = makeCandidateAdapter({ updateImportCandidate });
    const service = createImportCandidateService(adapter);

    const result = await service.updateImportCandidateStatus(
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      {
        reviewState: "needs_attention",
        acceptanceState: "pending",
        uncertaintyReason: "Date is unclear.",
      },
    );

    expect(result.reviewState).toBe("needs_attention");
    expect(result.uncertaintyReason).toBe("Date is unclear.");
    expect(updateImportCandidate).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      expect.objectContaining({
        review_state: "needs_attention",
        acceptance_state: "pending",
        uncertainty_reason: "Date is unclear.",
      }),
    );
  });

  it("clears candidate uncertainty when status no longer needs attention", async () => {
    const updateImportCandidate = vi.fn(async (_userId, importCandidateId, updates) => ({
      data: makeImportCandidateRow({
        id: importCandidateId,
        review_state: updates.review_state ?? "pending_review",
        acceptance_state: updates.acceptance_state ?? "pending",
        uncertainty_reason: updates.uncertainty_reason === undefined ? "Previous uncertainty" : updates.uncertainty_reason,
      }),
      error: null,
    }));
    const adapter = makeCandidateAdapter({ updateImportCandidate });
    const service = createImportCandidateService(adapter);

    const result = await service.updateImportCandidateStatus(
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      {
        reviewState: "reviewed",
        acceptanceState: "pending",
        uncertaintyReason: "Should clear",
      },
    );

    expect(result.reviewState).toBe("reviewed");
    expect(result.uncertaintyReason).toBeNull();
  });

  it("persists accepted transaction linkage for an accepted candidate", async () => {
    const updateImportCandidate = vi.fn(async (_userId, importCandidateId, updates) => ({
      data: makeImportCandidateRow({
        id: importCandidateId,
        review_state: updates.review_state ?? "reviewed",
        acceptance_state: updates.acceptance_state ?? "accepted",
        accepted_transaction_id: updates.accepted_transaction_id ?? null,
        uncertainty_reason: updates.uncertainty_reason === undefined ? null : updates.uncertainty_reason,
      }),
      error: null,
    }));
    const adapter = makeCandidateAdapter({ updateImportCandidate });
    const service = createImportCandidateService(adapter);

    const result = await service.updateImportCandidateStatus(
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      {
        reviewState: "reviewed",
        acceptanceState: "accepted",
        acceptedTransactionId: "44444444-4444-4444-4444-444444444444",
      },
    );

    expect(result.acceptedTransactionId).toBe("44444444-4444-4444-4444-444444444444");
    expect(updateImportCandidate).toHaveBeenCalledWith(
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      expect.objectContaining({
        review_state: "reviewed",
        acceptance_state: "accepted",
        accepted_transaction_id: "44444444-4444-4444-4444-444444444444",
      }),
    );
  });
});
