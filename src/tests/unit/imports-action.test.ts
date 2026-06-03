import { beforeEach, describe, expect, it, vi } from "vitest";

const loadAuthenticatedStagedImportBundle = vi.fn();

vi.mock("@/lib/server/imports-loader", () => ({
  loadAuthenticatedStagedImportBundle,
}));

describe("imports action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads an owned staged import bundle for the authenticated user", async () => {
    loadAuthenticatedStagedImportBundle.mockResolvedValueOnce({
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
    });

    const { loadStagedImportBundleAction } = await import("@/lib/actions/imports");
    const result = await loadStagedImportBundleAction("11111111-1111-1111-1111-111111111111");

    expect(loadAuthenticatedStagedImportBundle).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111", undefined);
    expect(result?.importRecord.id).toBe("11111111-1111-1111-1111-111111111111");
  }, 10000);

  it("fails closed for unauthenticated access", async () => {
    loadAuthenticatedStagedImportBundle.mockResolvedValueOnce(null);

    const { loadStagedImportBundleAction } = await import("@/lib/actions/imports");
    const result = await loadStagedImportBundleAction("11111111-1111-1111-1111-111111111111");

    expect(result).toBeNull();
  });

  it("fails closed for non-owned or missing records", async () => {
    loadAuthenticatedStagedImportBundle.mockResolvedValueOnce(null);

    const { loadStagedImportBundleAction } = await import("@/lib/actions/imports");
    const result = await loadStagedImportBundleAction("11111111-1111-1111-1111-111111111111");

    expect(result).toBeNull();
  });

  it("returns the staged import bundle shape cleanly", async () => {
    loadAuthenticatedStagedImportBundle.mockResolvedValueOnce({
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

    const { loadStagedImportBundleAction } = await import("@/lib/actions/imports");
    const result = await loadStagedImportBundleAction("11111111-1111-1111-1111-111111111111");

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
