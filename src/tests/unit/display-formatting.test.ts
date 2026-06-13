import { describe, expect, it } from "vitest";
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
