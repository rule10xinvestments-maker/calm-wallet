import { describe, expect, it, vi } from "vitest";
import {
  getOwnedStagedImportBundle,
  mapImportBundle,
  type ImportsReadModelAdapter,
} from "@/lib/server/imports-read-model";
import type { ImportCandidate, ImportRecord } from "@/domain/imports/types";

function makeImportRecord(overrides: Partial<ImportRecord> = {}): ImportRecord {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    importType: "receipt_image",
    storagePath: "imports/22222222-2222-2222-2222-222222222222/receipt_image/2026/04/upload.jpg",
    originalFilename: "receipt.jpg",
    mimeType: "image/jpeg",
    status: "uploaded",
    parseQuality: "unknown",
    failureReason: null,
    createdAt: "2026-04-21T10:00:00.000Z",
    updatedAt: "2026-04-21T10:00:00.000Z",
    ...overrides,
  };
}

function makeImportCandidate(overrides: Partial<ImportCandidate> = {}): ImportCandidate {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    userId: "22222222-2222-2222-2222-222222222222",
    importRecordId: "11111111-1111-1111-1111-111111111111",
    transactionType: "expense",
    amountMinor: 1250,
    currency: "USD",
    occurredAt: "2026-04-21T10:00:00.000Z",
    description: "Coffee shop",
    merchantGuess: "Corner Cafe",
    categoryId: null,
    confidenceScore: 0.82,
    reviewState: "pending_review",
    acceptanceState: "pending",
    acceptedTransactionId: null,
    uncertaintyReason: null,
    createdAt: "2026-04-21T10:05:00.000Z",
    updatedAt: "2026-04-21T10:05:00.000Z",
    ...overrides,
  };
}

function makeAdapter(overrides: Partial<ImportsReadModelAdapter> = {}): ImportsReadModelAdapter {
  return {
    getImportRecordById: vi.fn(async () => makeImportRecord()),
    listImportCandidatesForRecord: vi.fn(async () => [makeImportCandidate()]),
    ...overrides,
  };
}

describe("imports read model", () => {
  it("gets an owned staged import bundle", async () => {
    const adapter = makeAdapter();

    const result = await getOwnedStagedImportBundle(adapter, {
      userId: "22222222-2222-2222-2222-222222222222",
      importRecordId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result?.importRecord.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(result?.candidates).toHaveLength(1);
  });

  it("returns a safe miss for a non-owned import record", async () => {
    const listImportCandidatesForRecord = vi.fn(async () => [makeImportCandidate()]);
    const adapter = makeAdapter({
      getImportRecordById: vi.fn(async () => null),
      listImportCandidatesForRecord,
    });

    const result = await getOwnedStagedImportBundle(adapter, {
      userId: "other-user",
      importRecordId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result).toBeNull();
    expect(listImportCandidatesForRecord).not.toHaveBeenCalled();
  });

  it("includes candidates in the expected review-oriented shape", () => {
    const result = mapImportBundle({
      importRecord: makeImportRecord(),
      candidates: [
        makeImportCandidate({
          reviewState: "needs_attention",
          uncertaintyReason: "Date is unclear.",
        }),
      ],
    });

    expect(result.candidates).toEqual([
      expect.objectContaining({
        id: "33333333-3333-3333-3333-333333333333",
        reviewState: "needs_attention",
        acceptanceState: "pending",
        amountMinor: 1250,
        merchantGuess: "Corner Cafe",
        uncertaintyReason: "Date is unclear.",
      }),
    ]);
  });

  it("handles the empty-candidate case cleanly", async () => {
    const adapter = makeAdapter({
      listImportCandidatesForRecord: vi.fn(async () => []),
    });

    const result = await getOwnedStagedImportBundle(adapter, {
      userId: "22222222-2222-2222-2222-222222222222",
      importRecordId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result?.importRecord.originalFilename).toBe("receipt.jpg");
    expect(result?.candidates).toEqual([]);
  });
});
