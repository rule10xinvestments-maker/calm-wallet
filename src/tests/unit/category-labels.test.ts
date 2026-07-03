import { describe, expect, it } from "vitest";
import { getCategoryDisplayLabel, getCategoryLabel, getCategoryLabelKey } from "@/lib/categories/category-labels";

describe("category label i18n", () => {
  it("translates canonical category labels by locale", () => {
    expect(getCategoryLabel("Housing", "ro")).toBe("Locuință");
    expect(getCategoryLabel("groceries", "fr")).toBe("Courses");
    expect(getCategoryLabel("salary", "es")).toBe("Salario");
  });

  it("normalizes ids, slugs, and prefixed values to one category key", () => {
    expect(getCategoryLabelKey("category-self-employment")).toBe("categories.selfEmployment");
    expect(getCategoryLabelKey("cat-investments")).toBe("categories.investments");
    expect(getCategoryLabelKey("investment_income")).toBe("categories.investments");
    expect(getCategoryLabelKey("Investments")).toBe("categories.investments");
    expect(getCategoryLabel("manual-default-groceries", "ro")).toBe("Alimente");
  });

  it("keeps translated category labels out of canonical key lookup", () => {
    expect(getCategoryLabel("Investments", "ro")).toBe("Investiții");
    expect(getCategoryLabelKey("Investiții")).toBeNull();
  });

  it("uses the supplied category object without changing stored identifiers", () => {
    const category = { id: "category-groceries", slug: "groceries", label: "Groceries" };

    expect(getCategoryDisplayLabel(category, "ro")).toBe("Alimente");
    expect(category.id).toBe("category-groceries");
    expect(category.slug).toBe("groceries");
    expect(category.label).toBe("Groceries");
  });

  it("falls back safely for custom categories", () => {
    expect(getCategoryLabel("Custom savings bucket", "ro")).toBe("Custom savings bucket");
    expect(getCategoryLabel(null, "ro")).toBe("");
  });

  it("never throws for missing or malformed runtime category values", () => {
    expect(() => getCategoryLabel(undefined, "ro")).not.toThrow();
    expect(() => getCategoryLabel({ label: "Groceries" } as never, "ro")).not.toThrow();
    expect(getCategoryLabel(undefined, "ro")).toBe("");
    expect(getCategoryLabel("", "ro")).toBe("");
    expect(getCategoryLabel(123 as never, "ro")).toBe("123");
    expect(getCategoryLabel({ unexpected: "Groceries" } as never, "ro", "Fallback")).toBe("Fallback");
    expect(getCategoryLabel("groceries", { locale: "ro" } as never)).toBe("Groceries");
  });

  it("uses safe display fallbacks for nullable category objects", () => {
    expect(getCategoryDisplayLabel(null, "ro")).toBe("Necategorizat");
    expect(getCategoryDisplayLabel({ id: null, slug: null, label: null }, "ro")).toBe("");
    expect(getCategoryDisplayLabel({ id: "cat-groceries", slug: "groceries", label: null }, "ro")).toBe("Alimente");
  });
});
