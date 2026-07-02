"use client";

import { getCategoryVisualsByName } from "@/lib/category-icons";
import type { CategoryPickerOption } from "@/lib/category-picker-options";

type CategoryIconGridPickerProps = {
  categories: CategoryPickerOption[];
  selectedCategoryId: string;
  onSelect?: (category: CategoryPickerOption) => void;
  submitOnSelect?: boolean;
};

export function CategoryIconGridPicker({ categories, selectedCategoryId, onSelect, submitOnSelect = false }: CategoryIconGridPickerProps) {
  return (
    <div aria-label="Category picker" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
      {categories.map((category) => {
        const categoryVisuals = getCategoryVisualsByName(category.label);
        const CategoryIcon = categoryVisuals.icon;
        const isSelected = selectedCategoryId === category.id;

        return (
          <button
            aria-pressed={isSelected}
            className={`flex min-h-10 min-w-0 items-center gap-2 rounded-lg border px-2 py-1 text-left text-xs font-semibold transition ${
              isSelected ? "shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
            key={category.id}
            name={submitOnSelect ? "categoryId" : undefined}
            onClick={() => onSelect?.(category)}
            style={{
              backgroundColor: isSelected ? categoryVisuals.primary : "#FFFFFF",
              borderColor: isSelected ? categoryVisuals.primary : "#E2E8F0",
              color: isSelected ? "#FFFFFF" : "#334155",
            }}
            type={submitOnSelect ? "submit" : "button"}
            value={submitOnSelect ? category.id : undefined}
          >
            <CategoryIcon
              aria-hidden="true"
              className="size-4 shrink-0"
              strokeWidth={2.1}
              style={{ color: isSelected ? "#FFFFFF" : categoryVisuals.primary }}
            />
            <span className="truncate">{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
