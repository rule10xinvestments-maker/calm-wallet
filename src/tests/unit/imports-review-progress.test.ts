import { describe, expect, it, vi } from "vitest";
import {
  loadStagedImportReviewProgress,
  mapStagedImportReviewProgress,
} from "@/lib/server/imports-review-progress";
import type { StagedImportBundle } from "@/lib/server/imports-read-model";

function makeBundle(overrides: Partial<StagedImportBundle> = {}): StagedImportBundle {
  return {
    importRecord: {
      id: "11111111-1111-1111-1111-111111111111",
      importType: "receipt_image",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "parsed",
      parseQuality: "high",
      failureReason: null,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:05:00.000Z",
    },
    candidates: [
      {
        id: "candidate-1",
        reviewState: "reviewed",
        acceptanceState: "accepted",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-23T09:00:00.000Z",
        description: "Coffee shop",
        merchantGuess: "Corner Cafe",
        confidenceScore: 0.82,
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:00:00.000Z",
        updatedAt: "2026-04-23T10:01:00.000Z",
      },
      {
        id: "candidate-2",
        reviewState: "reviewed",
        acceptanceState: "rejected",
        transactionType: "expense",
        amountMinor: 2400,
        currency: "USD",
        occurredAt: "2026-04-23T09:30:00.000Z",
        description: "Lunch",
        merchantGuess: "Market Deli",
        confidenceScore: 0.74,
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:02:00.000Z",
        updatedAt: "2026-04-23T10:03:00.000Z",
      },
      {
        id: "candidate-3",
        reviewState: "pending_review",
        acceptanceState: "pending",
        transactionType: "expense",
        amountMinor: 900,
        currency: "USD",
        occurredAt: "2026-04-23T09:45:00.000Z",
        description: "Parking",
        merchantGuess: "City Parking",
        confidenceScore: 0.63,
        uncertaintyReason: null,
        createdAt: "2026-04-23T10:04:00.000Z",
        updatedAt: "2026-04-23T10:05:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("imports review progress", () => {
  it("loads review progress for an owned staged import record", async () => {
    const result = await loadStagedImportReviewProgress("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      loadOwnedStagedImportBundle: vi.fn(async () => makeBundle()),
    });

    expect(result).toEqual({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 3,
      acceptedCount: 1,
      rejectedCount: 1,
      pendingCount: 1,
    });
  });

  it("fails closed for unauthenticated access", async () => {
    const loadOwned = vi.fn();

    const result = await loadStagedImportReviewProgress("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => null),
      loadOwnedStagedImportBundle: loadOwned,
    });

    expect(result).toBeNull();
    expect(loadOwned).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const result = await loadStagedImportReviewProgress("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      loadOwnedStagedImportBundle: vi.fn(async () => null),
    });

    expect(result).toBeNull();
  });

  it("handles the empty candidate set cleanly", async () => {
    const result = await loadStagedImportReviewProgress("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      loadOwnedStagedImportBundle: vi.fn(async () => makeBundle({ candidates: [] })),
    });

    expect(result).toEqual({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
    });
  });

  it("returns the expected progress shape", () => {
    const result = mapStagedImportReviewProgress(makeBundle());

    expect(result).toEqual({
      importRecordId: "11111111-1111-1111-1111-111111111111",
      totalCandidateCount: 3,
      acceptedCount: 1,
      rejectedCount: 1,
      pendingCount: 1,
    });
  });
});
