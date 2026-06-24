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
      confidenceScore: 0.72,
      reviewState: "pending_review",
      uncertaintyReason: "We found a total. Please review before saving.",
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
    expect(draft.confidenceScore).toBe(0);
    expect(draft.reviewState).toBe("needs_attention");
    expect(draft.uncertaintyReason).toBe("Receipt uploaded, but Calm Wallet could not extract a total yet.");
  });

  it("prefers explicit total lines over ordinary line-item amounts", () => {
    expect(extractReceiptTotalMinor("Milk 7.50\nBread 5.20\nTOTAL 12.70")).toBe(1270);
  });

  it("extracts Romanian comma-decimal totals and maps Lei to RON", () => {
    const draft = buildReceiptDraft({
      extractedText: "MEGA IMAGE\nPaine 5,20\nTOTAL 35,24 Lei",
      originalFilename: "281.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-15T10:00:00.000Z"),
    });

    expect(draft.amountMinor).toBe(3524);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Mega Image");
    expect(draft.categoryId).toBe(groceriesCategory.id);
  });

  it("extracts dot-decimal TOTAL LEI receipt text as RON", () => {
    const draft = buildReceiptDraft({
      extractedText: "VASCAR S.A.\nCOCA COLA 2L SGR\nLAYS SARE 125G\nTOTAL LEI 20.80",
      originalFilename: "receipt.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-21T08:39:00.000Z"),
    });

    expect(draft.amountMinor).toBe(2080);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Vascar");
    expect(draft.categoryId).toBe(groceriesCategory.id);
  });

  it("extracts dot-decimal TOTAL amount when currency follows the value", () => {
    const draft = buildReceiptDraft({
      extractedText: "VASCAR S.A.\nTOTAL 20.80 LEI",
      originalFilename: "receipt.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-21T08:39:00.000Z"),
    });

    expect(draft.amountMinor).toBe(2080);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Vascar");
  });

  it("uses Romanian electronic payment as fallback when total is unavailable", () => {
    const draft = buildReceiptDraft({
      extractedText: "VASCAR S.A.\nPLATA MODERNA: ELECTRONIC 20.8 LEI",
      originalFilename: "10824.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-21T08:39:00.000Z"),
    });

    expect(draft.amountMinor).toBe(2080);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Vascar");
  });

  it("handles common Tesseract OCR slips on Vascar electronic payment lines", () => {
    const draft = buildReceiptDraft({
      extractedText: "URSCAF\nCR COLA 2 SGR\nLAYS SARE 1256\nTOTAL LEI\nPLATR MODERNA: ELECTRONIC 20.8 LE",
      originalFilename: "10824.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-21T08:39:00.000Z"),
    });

    expect(draft.amountMinor).toBe(2080);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Vascar");
    expect(draft.categoryId).toBe(groceriesCategory.id);
  });

  it("maps structured Mega Image OCR fields into a staged grocery draft", () => {
    const draft = buildReceiptDraft({
      extractedText: "MEGA IMAGE\nBon fiscal",
      extractedFields: {
        merchant: "MEGA IMAGE",
        totalText: "35,24 Lei",
        currency: "Lei",
        categoryHint: "Groceries",
      },
      originalFilename: "281.jpg",
      defaultCurrency: "USD",
      categories: [groceriesCategory],
      now: new Date("2026-06-15T10:00:00.000Z"),
    });

    expect(draft.amountMinor).toBe(3524);
    expect(draft.currency).toBe("RON");
    expect(draft.merchantGuess).toBe("Mega Image");
    expect(draft.categoryId).toBe(groceriesCategory.id);
    expect(draft.reviewState).toBe("pending_review");
  });

  it("does not select VAT totals as the receipt amount", () => {
    expect(
      extractReceiptTotalMinor(
        [
          "MEGA IMAGE",
          "Lapte 12,50",
          "TOTAL 35,24",
          "TOTAL TVA 3,19",
          "TVA 9% 2,91",
        ].join("\n"),
      ),
    ).toBe(3524);
  });

  it("ignores Vascar VAT totals in favor of the final payable total", () => {
    expect(
      extractReceiptTotalMinor(
        [
          "VASCAR S.A.",
          "TOTAL LEI 20.80",
          "TOTAL TVA A - 21% 2.12",
          "TOTAL TVA B - 11% 0.80",
          "TOTAL TVA BON 2.92",
        ].join("\n"),
      ),
    ).toBe(2080);
  });

  it("leaves amount missing when no reliable total is visible", () => {
    expect(extractReceiptTotalMinor("MEGA IMAGE\nLapte 12,50\nPaine 4,99\nTVA 1,57")).toBeNull();
  });
});
