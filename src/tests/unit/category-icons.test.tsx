import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryIconGridPicker } from "@/components/category/category-icon-grid-picker";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getCategoryIconByName, getCategoryVisualsByName } from "@/lib/category-icons";

const expectedIcons = [
  ["Housing", "lucide-house"],
  ["Groceries", "lucide-shopping-basket"],
  ["Dining", "lucide-utensils"],
  ["Transport", "lucide-car"],
  ["Utilities", "lucide-receipt"],
  ["Health", "lucide-heart-pulse"],
  ["Shopping", "lucide-shopping-bag"],
  ["Entertainment", "lucide-ticket"],
  ["Travel", "lucide-plane"],
  ["Education", "lucide-book-open"],
  ["Salary", "lucide-wallet"],
  ["Self-employment", "lucide-briefcase"],
  ["Refunds", "lucide-rotate-ccw"],
  ["Gifts", "lucide-gift"],
  ["Transfers", "lucide-arrow-right-left"],
  ["Investments", "lucide-trending-up"],
  ["Sales", "lucide-store"],
  ["Rental income", "lucide-building-2"],
  ["Side income", "lucide-coins"],
  ["Other", "lucide-tag"],
] as const;

const expectedVisuals = [
  ["Housing", "#4F46E5", "#EEF2FF", "#C7D2FE"],
  ["Groceries", "#16A34A", "#DCFCE7", "#86EFAC"],
  ["Dining", "#E11D48", "#FFE4E6", "#FDA4AF"],
  ["Transport", "#2563EB", "#DBEAFE", "#93C5FD"],
  ["Utilities", "#F97316", "#FFEDD5", "#FDBA74"],
  ["Health", "#8B5CF6", "#EDE9FE", "#C4B5FD"],
  ["Shopping", "#EC4899", "#FCE7F3", "#F9A8D4"],
  ["Entertainment", "#D97706", "#FEF3C7", "#FCD34D"],
  ["Travel", "#0EA5E9", "#E0F2FE", "#7DD3FC"],
  ["Education", "#06B6D4", "#CFFAFE", "#67E8F9"],
  ["Salary", "#059669", "#D1FAE5", "#6EE7B7"],
  ["Self-employment", "#92400E", "#FDE68A", "#FBBF24"],
  ["Refunds", "#65A30D", "#ECFCCB", "#BEF264"],
  ["Gifts", "#C026D3", "#FAE8FF", "#E879F9"],
  ["Transfers", "#475569", "#E2E8F0", "#CBD5E1"],
  ["Investments", "#0F766E", "#CCFBF1", "#5EEAD4"],
  ["Sales", "#7C3AED", "#EDE9FE", "#C4B5FD"],
  ["Rental income", "#0369A1", "#E0F2FE", "#7DD3FC"],
  ["Side income", "#9333EA", "#F3E8FF", "#D8B4FE"],
  ["Other", "#CA8A04", "#FEF9C3", "#FDE047"],
  ["Needs category", "#0EA5E9", "#E0F2FE", "#7DD3FC"],
] as const;

describe("category icon mapping", () => {
  it("uses the locked distinct default category icons", () => {
    for (const [label, iconClass] of expectedIcons) {
      const Icon = getCategoryIconByName(label);
      render(<Icon aria-label={`${label} icon`} />);

      expect(screen.getByLabelText(`${label} icon`)).toHaveClass(iconClass);
    }
  });

  it("falls back to Tag for unknown category labels", () => {
    const Icon = getCategoryIconByName("Custom category");
    render(<Icon aria-label="Custom category icon" />);

    expect(screen.getByLabelText("Custom category icon")).toHaveClass("lucide-tag");
  });

  it("uses the locked distinct default category visual tokens", () => {
    const primaryColors = new Set<string>();

    for (const [label, primary, bg, border] of expectedVisuals) {
      const visuals = getCategoryVisualsByName(label);

      expect(visuals.primary).toBe(primary);
      expect(visuals.bg).toBe(bg);
      expect(visuals.border).toBe(border);
      if (label !== "Needs category") {
        primaryColors.add(visuals.primary);
      }
    }

    expect(primaryColors.size).toBe(expectedVisuals.filter(([label]) => label !== "Needs category").length);
  });

  it("uses safe fallback visual tokens for custom categories", () => {
    const visuals = getCategoryVisualsByName("Custom category");

    expect(visuals.primary).toBe("#64748B");
    expect(visuals.bg).toBe("#F1F5F9");
    expect(visuals.border).toBe("#CBD5E1");
  });

  it("renders shared category picker labels in the selected locale", () => {
    render(
      <LocaleProvider savedLocale="ro">
        <CategoryIconGridPicker
          categories={[
            { id: "category-housing", slug: "housing", label: "Housing", direction: "expense" },
            { id: "category-groceries", slug: "groceries", label: "Groceries", direction: "expense" },
          ]}
          selectedCategoryId="category-housing"
        />
      </LocaleProvider>,
    );

    expect(screen.getByRole("button", { name: "Locuință" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Alimente" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Housing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Groceries" })).not.toBeInTheDocument();
  });
});
