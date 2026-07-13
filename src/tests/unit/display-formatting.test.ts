import { describe, expect, it } from "vitest";
import { formatDateKey, formatDisplayMoney, formatDisplayNumber } from "@/lib/display-formatting";
import { formatTransactionTitleForDisplay } from "@/lib/utils";

describe("transaction title display formatting", () => {
  it("capitalizes only the first visible character for all-lowercase titles", () => {
    expect(formatTransactionTitleForDisplay("cola")).toBe("Cola");
    expect(formatTransactionTitleForDisplay("gv galben")).toBe("Gv galben");
    expect(formatTransactionTitleForDisplay("de la tata")).toBe("De la tata");
  });

  it("preserves existing mixed-case titles", () => {
    expect(formatTransactionTitleForDisplay("Kaufland")).toBe("Kaufland");
    expect(formatTransactionTitleForDisplay("iPhone charger")).toBe("iPhone charger");
  });
});

describe("locale-aware display formatting", () => {
  it("formats dates with the selected Calm Wallet locale instead of the browser locale", () => {
    expect(formatDateKey("2026-07-13", "ro", { month: "long", year: "numeric" })).toContain("iulie");
    expect(formatDateKey("2026-07-13", "fr", { month: "long", year: "numeric" })).toContain("juillet");
    expect(formatDateKey("2026-07-13", "es", { month: "long", year: "numeric" })).toContain("julio");
    expect(formatDateKey("2026-07-13", "en", { month: "long", year: "numeric" })).toContain("July");
  });

  it("formats numbers and currency with locale-specific separators", () => {
    expect(formatDisplayNumber(1234.5, "ro", { minimumFractionDigits: 1 })).toBe("1.234,5");
    expect(formatDisplayMoney(123450, "RON", "ro")).toContain("1.234,50");
    expect(formatDisplayMoney(123450, "EUR", "fr")).toContain("1 234,50");
    expect(formatDisplayMoney(123450, "USD", "en")).toContain("1,234.50");
  });
});
