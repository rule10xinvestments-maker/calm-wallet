# Sprint 15 Plan Recommendation

## Recommended Objective
Improve review ergonomics for remembered category suggestions without expanding into custom rules or automation-heavy categorization.

## Recommended Scope
- Show a compact "suggested by your corrections" hint on staged import candidates when category memory supplied the category.
- Add a minimal way to change a staged candidate category before accepting if it can stay inside the existing Transactions review surface.
- Add tests for accepted candidate category changes recording new memory.
- Consider conflict handling for two memories pointing to different categories only if it stays service-layer and hidden from UI complexity.

## Guardrails
- No new primary page.
- No custom categories.
- No rule-builder UI.
- No global learning.
- No model training system.
- No PDF import support.
- No bank/card linking.
- No Available balance wording.
- No automatic fake certainty.
- No uncontrolled AI behavior.
- Imported content remains untrusted input.

## Suggested Done Criteria
- Category memory remains user-owned and controlled-category-only.
- Review remains the place where uncertain imports are accepted or rejected.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, Sprint 12 budgets, Sprint 13 CSV import, and Sprint 14 memory regressions remain green.
- Full validation passes before packaging.
