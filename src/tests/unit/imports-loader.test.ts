import { describe, expect, it, vi } from "vitest";
import { mockUser } from "@/tests/unit/test-users";
import { loadAuthenticatedStagedImportBundle } from "@/lib/server/imports-loader";
import type { StagedImportBundle } from "@/lib/server/imports-read-model";

function makeBundle(overrides: Partial<StagedImportBundle> = {}): StagedImportBundle {
  return {
    importRecord: {
      id: "11111111-1111-1111-1111-111111111111",
      importType: "receipt_image",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded",
      parseQuality: "unknown",
      failureReason: null,
      createdAt: "2026-04-21T10:00:00.000Z",
      updatedAt: "2026-04-21T10:00:00.000Z",
    },
    candidates: [
      {
        id: "33333333-3333-3333-3333-333333333333",
        reviewState: "pending_review",
        acceptanceState: "pending",
        transactionType: "expense",
        amountMinor: 1250,
        currency: "USD",
        occurredAt: "2026-04-21T10:00:00.000Z",
        description: "Coffee shop",
        merchantGuess: "Corner Cafe",
        confidenceScore: 0.82,
        uncertaintyReason: null,
        createdAt: "2026-04-21T10:05:00.000Z",
        updatedAt: "2026-04-21T10:05:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("imports loader", () => {
  it("loads an owned staged import bundle for the authenticated user", async () => {
    const loadOwned = vi.fn(async () => makeBundle());

    const result = await loadAuthenticatedStagedImportBundle("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => mockUser()),
      loadOwnedStagedImportBundle: loadOwned,
    });

    expect(result?.importRecord.id).toBe("11111111-1111-1111-1111-111111111111");
    expect(loadOwned).toHaveBeenCalledWith({
      userId: "user-1",
      importRecordId: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("fails closed for unauthenticated access", async () => {
    const loadOwned = vi.fn(async () => makeBundle());

    const result = await loadAuthenticatedStagedImportBundle("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => null),
      loadOwnedStagedImportBundle: loadOwned,
    });

    expect(result).toBeNull();
    expect(loadOwned).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned access", async () => {
    const result = await loadAuthenticatedStagedImportBundle("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => mockUser()),
      loadOwnedStagedImportBundle: vi.fn(async () => null),
    });

    expect(result).toBeNull();
  });

  it("returns the staged import bundle shape cleanly", async () => {
    const result = await loadAuthenticatedStagedImportBundle("11111111-1111-1111-1111-111111111111", {
      getCurrentUser: vi.fn(async () => mockUser()),
      loadOwnedStagedImportBundle: vi.fn(async () =>
        makeBundle({
          candidates: [],
        }),
      ),
    });

    expect(result).toEqual({
      importRecord: {
        id: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        originalFilename: "receipt.jpg",
        mimeType: "image/jpeg",
        status: "uploaded",
        parseQuality: "unknown",
        failureReason: null,
        createdAt: "2026-04-21T10:00:00.000Z",
        updatedAt: "2026-04-21T10:00:00.000Z",
      },
      candidates: [],
    });
  });
});
