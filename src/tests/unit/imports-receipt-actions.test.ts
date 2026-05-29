import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initialReceiptCandidateStagingActionState,
  initialReceiptImageUploadActionState,
} from "@/lib/actions/imports-state";
import { mockUser } from "@/tests/unit/test-users";

function makeReceiptFile(overrides: FilePropertyBag & { name?: string } = {}) {
  return new File(["receipt"], overrides.name ?? "receipt.jpg", {
    type: overrides.type ?? "image/jpeg",
    lastModified: overrides.lastModified,
  });
}

describe("receipt import actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads a receipt image through the authenticated server action", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "Receipt.JPG", type: "image/jpeg" }));
    const createImportRecord = vi.fn(async () => ({
      id: "11111111-1111-1111-1111-111111111111",
      userId: "user-1",
      importType: "receipt_image" as const,
      storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
      originalFilename: "receipt.jpg",
      mimeType: "image/jpeg",
      status: "uploaded" as const,
      parseQuality: "unknown" as const,
      failureReason: null,
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T10:00:00.000Z",
    }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord })),
      uploadObject: vi.fn(async () => undefined),
      buildImportStoragePath: vi.fn(() => "user-1/receipt_image/2026/05/receipt.jpg"),
      sanitizeImportFilename: vi.fn(() => "receipt.jpg"),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "success",
      message: "Receipt image uploaded for review.",
      upload: expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        mimeType: "image/jpeg",
      }),
    });
  });

  it("rejects PDFs through the receipt image action", async () => {
    const formData = new FormData();
    formData.set("file", makeReceiptFile({ name: "receipt.pdf", type: "application/pdf" }));

    const { uploadReceiptImageAction } = await import("@/lib/actions/imports");
    const result = await uploadReceiptImageAction(initialReceiptImageUploadActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({ createImportRecord: vi.fn() })),
      uploadObject: vi.fn(),
      buildImportStoragePath: vi.fn(),
      sanitizeImportFilename: vi.fn(),
      now: () => new Date("2026-05-02T10:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "error",
      message: "Receipt upload must be a supported image file.",
      upload: null,
    });
  });

  it("stages a receipt candidate through the authenticated server action", async () => {
    const formData = new FormData();
    formData.set("importRecordId", "11111111-1111-1111-1111-111111111111");
    formData.set("transactionType", "expense");
    formData.set("amountMinor", "1299");
    formData.set("currency", "USD");
    formData.set("occurredAt", "2026-05-02T10:00:00.000Z");
    formData.set("description", "Coffee receipt");
    formData.set("merchantGuess", "Corner Cafe");

    const candidate = {
      id: "33333333-3333-3333-3333-333333333333",
      userId: "user-1",
      importRecordId: "11111111-1111-1111-1111-111111111111",
      transactionType: "expense" as const,
      amountMinor: 1299,
      currency: "USD",
      occurredAt: "2026-05-02T10:00:00.000Z",
      description: "Coffee receipt",
      merchantGuess: "Corner Cafe",
      categoryId: null,
      confidenceScore: null,
      reviewState: "pending_review" as const,
      acceptanceState: "pending" as const,
      acceptedTransactionId: null,
      uncertaintyReason: null,
      createdAt: "2026-05-02T10:05:00.000Z",
      updatedAt: "2026-05-02T10:05:00.000Z",
    };

    const { stageReceiptCandidateAction } = await import("@/lib/actions/imports");
    const result = await stageReceiptCandidateAction(initialReceiptCandidateStagingActionState, formData, {
      getCurrentUser: vi.fn(async () => mockUser()),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/05/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "parsed" as const,
          parseQuality: "unknown" as const,
          failureReason: null,
          createdAt: "2026-05-02T10:00:00.000Z",
          updatedAt: "2026-05-02T10:00:00.000Z",
        })),
        updateImportRecordStatus: vi.fn(),
      })),
      createImportCandidateService: vi.fn(async () => ({
        createImportCandidate: vi.fn(async () => candidate),
      })),
    });

    expect(result).toEqual({
      status: "success",
      message: "Receipt candidate staged for review.",
      candidate,
    });
  });
});
