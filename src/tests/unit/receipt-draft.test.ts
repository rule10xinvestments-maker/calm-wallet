import { describe, expect, it } from "vitest";
import {
  buildReceiptDraft,
  detectReceiptCurrency,
  extractReceiptTotalMinor,
  receiptLooksLikeGroceries,
} from "@/lib/server/receipt-draft";

const groceriesCategory = {
  id: "33333333-3333-3333-3333-333333333333",
  slug: "groceries",
  label: "Groceries",
  direction: "expense" as const,
};

describe("receipt draft extraction", () => {
  it("maps a detected receipt total to a single expense amount", () => {
    const draft = buildReceiptDraft({
      extractedText: "Mega Image\nLapte\nTOTAL 87,45 LEI",
      originalFilename: "grocery-receipt.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-15T10:00:00.000Z"),
    });

    expect(draft).toEqual({
      transactionType: "expense",
      amountMinor: 8745,
      currency: "RON",
      occurredAt: "2026-06-15T10:00:00.000Z",
      description: "Receipt from Mega Image",
      merchantGuess: "Mega Image",
      categoryId: "33333333-3333-3333-3333-333333333333",
      reviewState: "pending_review",
      uncertaintyReason: null,
    });
  });

  it("detects common currencies without changing the original receipt currency", () => {
    expect(detectReceiptCurrency("TOTAL 12.99 EUR", "USD")).toBe("EUR");
    expect(detectReceiptCurrency("TOTAL $18.50", "RON")).toBe("USD");
    expect(detectReceiptCurrency("TOTAL 49.00", "RON")).toBe("RON");
  });

  it("recognizes grocery, food, and household receipt context best-effort", () => {
    expect(receiptLooksLikeGroceries("Kaufland supermarket household staples")).toBe(true);
    expect(receiptLooksLikeGroceries("Hotel booking")).toBe(false);
  });

  it("marks uncertain extraction as Needs review without inventing an amount", () => {
    const draft = buildReceiptDraft({
      extractedText: null,
      originalFilename: "receipt.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-15T10:00:00.000Z"),
    });

    expect(draft.transactionType).toBe("expense");
    expect(draft.amountMinor).toBeNull();
    expect(draft.currency).toBeNull();
    expect(draft.reviewState).toBe("needs_attention");
    expect(draft.uncertaintyReason).toBe("Receipt uploaded, but Calm Wallet could not extract a total yet.");
  });

  it("prefers explicit total lines over ordinary line-item amounts", () => {
    expect(extractReceiptTotalMinor("Milk 7.50\nBread 5.20\nTOTAL 12.70")).toBe(1270);
  });
});
