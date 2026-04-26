import { beforeEach, describe, expect, it, vi } from "vitest";
import { ingestImportParserResult } from "@/lib/server/imports-parser-result-ingestion";

describe("imports parser result ingestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingests owned parser results into import candidates", async () => {
    const createImportCandidate = vi.fn(async (_userId, input) => ({
      id: input.description === "Coffee shop" ? "candidate-1" : "candidate-2",
      userId: "user-1",
      importRecordId: input.importRecordId,
      transactionType: input.transactionType ?? null,
      amountMinor: input.amountMinor ?? null,
      currency: input.currency ?? null,
      occurredAt: input.occurredAt ?? null,
      description: input.description ?? null,
      merchantGuess: input.merchantGuess ?? null,
      categoryId: null,
      confidenceScore: input.confidenceScore ?? null,
      reviewState: input.reviewState ?? "pending_review",
      acceptanceState: input.acceptanceState ?? "pending",
      acceptedTransactionId: null,
      uncertaintyReason: input.uncertaintyReason ?? null,
      createdAt: "2026-04-23T10:00:00.000Z",
      updatedAt: "2026-04-23T10:00:00.000Z",
    }));

    const result = await ingestImportParserResult(
      {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        candidates: [
          {
            transactionType: "expense",
            amountMinor: 1250,
            currency: "USD",
            occurredAt: "2026-04-23T09:00:00.000Z",
            description: "Coffee shop",
            merchantGuess: "Corner Cafe",
            confidenceScore: 0.82,
          },
          {
            transactionType: "expense",
            amountMinor: 2400,
            currency: "USD",
            occurredAt: "2026-04-23T09:30:00.000Z",
            description: "Lunch",
            merchantGuess: "Market Deli",
            confidenceScore: 0.74,
          },
        ],
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "11111111-1111-1111-1111-111111111111",
            userId: "user-1",
            importType: "receipt_image" as const,
            storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
            originalFilename: "receipt.jpg",
            mimeType: "image/jpeg",
            status: "parsed" as const,
            parseQuality: "high" as const,
            failureReason: null,
            createdAt: "2026-04-23T09:00:00.000Z",
            updatedAt: "2026-04-23T09:05:00.000Z",
          })),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(createImportCandidate).toHaveBeenNthCalledWith(
      1,
      "user-1",
      expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        description: "Coffee shop",
      }),
    );
    expect(createImportCandidate).toHaveBeenNthCalledWith(
      2,
      "user-1",
      expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        description: "Lunch",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        importRecordId: "11111111-1111-1111-1111-111111111111",
        importType: "receipt_image",
        candidatesCreated: 2,
      }),
    );
  });

  it("does not create duplicate candidates when the same payload is retried", async () => {
    const createImportCandidate = vi.fn(async (_userId, input) => ({
      id: "candidate-created",
      userId: "user-1",
      importRecordId: input.importRecordId,
      transactionType: input.transactionType ?? null,
      amountMinor: input.amountMinor ?? null,
      currency: input.currency ?? null,
      occurredAt: input.occurredAt ?? null,
      description: input.description ?? null,
      merchantGuess: input.merchantGuess ?? null,
      categoryId: null,
      confidenceScore: input.confidenceScore ?? null,
      reviewState: input.reviewState ?? "pending_review",
      acceptanceState: input.acceptanceState ?? "pending",
      acceptedTransactionId: null,
      uncertaintyReason: input.uncertaintyReason ?? null,
      createdAt: "2026-04-23T10:00:00.000Z",
      updatedAt: "2026-04-23T10:00:00.000Z",
    }));
    const listImportCandidates = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "candidate-created",
          userId: "user-1",
          importRecordId: "11111111-1111-1111-1111-111111111111",
          transactionType: "expense" as const,
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          description: "Coffee shop",
          merchantGuess: "Corner Cafe",
          categoryId: null,
          confidenceScore: 0.82,
          reviewState: "pending_review" as const,
          acceptanceState: "pending" as const,
          acceptedTransactionId: null,
          uncertaintyReason: null,
          createdAt: "2026-04-23T10:00:00.000Z",
          updatedAt: "2026-04-23T10:00:00.000Z",
        },
      ]);
    const dependencies = {
      getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
      createImportRecordService: vi.fn(async () => ({
        getImportRecordById: vi.fn(async () => ({
          id: "11111111-1111-1111-1111-111111111111",
          userId: "user-1",
          importType: "receipt_image" as const,
          storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
          originalFilename: "receipt.jpg",
          mimeType: "image/jpeg",
          status: "parsed" as const,
          parseQuality: "high" as const,
          failureReason: null,
          createdAt: "2026-04-23T09:00:00.000Z",
          updatedAt: "2026-04-23T09:05:00.000Z",
        })),
      })),
      createImportCandidateService: vi.fn(async () => ({
        listImportCandidates,
        createImportCandidate,
      })),
    };
    const payload = {
      importRecordId: "11111111-1111-1111-1111-111111111111",
      candidates: [
        {
          transactionType: "expense" as const,
          amountMinor: 1250,
          currency: "USD",
          occurredAt: "2026-04-23T09:00:00.000Z",
          description: "Coffee shop",
          merchantGuess: "Corner Cafe",
          confidenceScore: 0.82,
        },
      ],
    };

    const firstResult = await ingestImportParserResult(payload, dependencies);
    const secondResult = await ingestImportParserResult(payload, dependencies);

    expect(firstResult).toEqual(
      expect.objectContaining({
        candidatesCreated: 1,
      }),
    );
    expect(secondResult).toEqual(
      expect.objectContaining({
        candidatesCreated: 0,
      }),
    );
    expect(createImportCandidate).toHaveBeenCalledTimes(1);
    expect(secondResult?.candidates).toEqual([
      expect.objectContaining({
        id: "candidate-created",
        importRecordId: "11111111-1111-1111-1111-111111111111",
      }),
    ]);
  });

  it("fails closed for unauthenticated access", async () => {
    const getImportRecordById = vi.fn();
    const createImportCandidate = vi.fn();

    const result = await ingestImportParserResult(
      {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        candidates: [],
      },
      {
        getCurrentUser: vi.fn(async () => null),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById,
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(),
          createImportCandidate,
        })),
      },
    );

    expect(result).toBeNull();
    expect(getImportRecordById).not.toHaveBeenCalled();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });

  it("fails closed for non-owned or missing import records", async () => {
    const createImportCandidate = vi.fn();

    const result = await ingestImportParserResult(
      {
        importRecordId: "11111111-1111-1111-1111-111111111111",
        candidates: [],
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => {
            throw new Error("Import record not found.");
          }),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(),
          createImportCandidate,
        })),
      },
    );

    expect(result).toBeNull();
    expect(createImportCandidate).not.toHaveBeenCalled();
  });

  it("rejects an invalid parser-result payload", async () => {
    await expect(
      ingestImportParserResult(
        {
          importRecordId: "11111111-1111-1111-1111-111111111111",
          candidates: [
            {
              amountMinor: -1,
            },
          ],
        },
        {
          getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
          createImportRecordService: vi.fn(async () => ({
            getImportRecordById: vi.fn(),
          })),
          createImportCandidateService: vi.fn(async () => ({
            listImportCandidates: vi.fn(),
            createImportCandidate: vi.fn(),
          })),
        },
      ),
    ).rejects.toThrow();
  });

  it("links created candidates to the correct import record", async () => {
    const createImportCandidate = vi.fn(async (_userId, input) => ({
      id: "candidate-1",
      userId: "user-1",
      importRecordId: input.importRecordId,
      transactionType: null,
      amountMinor: null,
      currency: null,
      occurredAt: null,
      description: null,
      merchantGuess: null,
      categoryId: null,
      confidenceScore: null,
      reviewState: "pending_review" as const,
      acceptanceState: "pending" as const,
      acceptedTransactionId: null,
      uncertaintyReason: null,
      createdAt: "2026-04-23T10:00:00.000Z",
      updatedAt: "2026-04-23T10:00:00.000Z",
    }));

    const result = await ingestImportParserResult(
      {
        importRecordId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        candidates: [{}],
      },
      {
        getCurrentUser: vi.fn(async () => ({ id: "user-1" } as { id: string })),
        createImportRecordService: vi.fn(async () => ({
          getImportRecordById: vi.fn(async () => ({
            id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            userId: "user-1",
            importType: "csv_import" as const,
            storagePath: "user-1/csv_import/2026/04/statement.csv",
            originalFilename: "statement.csv",
            mimeType: "text/csv",
            status: "parsed" as const,
            parseQuality: "medium" as const,
            failureReason: null,
            createdAt: "2026-04-23T09:00:00.000Z",
            updatedAt: "2026-04-23T09:05:00.000Z",
          })),
        })),
        createImportCandidateService: vi.fn(async () => ({
          listImportCandidates: vi.fn(async () => []),
          createImportCandidate,
        })),
      },
    );

    expect(result?.candidates[0]?.importRecordId).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });
});
