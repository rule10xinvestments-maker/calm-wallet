import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCategoryIconByName } from "@/lib/category-icons";

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
  ["Other", "lucide-tag"],
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
});
