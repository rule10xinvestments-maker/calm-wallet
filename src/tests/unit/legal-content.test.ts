import { describe, expect, it } from "vitest";
import { legalDocuments } from "@/domain/legal/config";
import {
  getLegalDocumentContent,
  getLegalDocumentContentText,
  usesCanonicalEnglishLegalContent,
} from "@/domain/legal/content";

describe("legal document content", () => {
  it("publishes the final legal documents as version 1.1", () => {
    expect(legalDocuments.map((document) => [document.id, document.version])).toEqual([
      ["terms", "1.1"],
      ["privacy", "1.1"],
      ["refund", "1.1"],
      ["ai", "1.1"],
    ]);
  });

  it("renders final content instead of placeholders", () => {
    expect(getLegalDocumentContentText("terms", "en")).toContain("Welcome to Calm Wallet");
    expect(getLegalDocumentContentText("privacy", "en")).toContain("Your privacy matters to us");
    expect(getLegalDocumentContentText("refund", "en")).toContain("This Refund Policy explains");
    expect(getLegalDocumentContentText("ai", "en")).toContain("This AI Disclaimer explains");
  });

  it("does not keep launch placeholders or draft markers in published content", () => {
    for (const document of legalDocuments) {
      const text = getLegalDocumentContentText(document.id, "en");

      expect(text).not.toMatch(/\[Launch Date\]/);
      expect(text).not.toMatch(/\b(?:TBD|TODO|INSERT|PLACEHOLDER)\b/i);
      expect(text).not.toContain("Placeholder for the production");
    }
  });

  it("keeps semantic legal body blocks for mobile rendering", () => {
    expect(getLegalDocumentContent("terms", "en")).toContainEqual({ type: "heading", level: 2, text: "In Short" });
    expect(getLegalDocumentContent("terms", "en")).toContainEqual({
      type: "list",
      items: expect.arrayContaining(["Credits never expire", "AI may make mistakes"]),
    });
  });

  it("falls back to canonical English body for locales without reviewed legal translations", () => {
    expect(usesCanonicalEnglishLegalContent("terms", "ro")).toBe(true);
    expect(getLegalDocumentContentText("terms", "ro")).toContain("Welcome to Calm Wallet");
  });
});
