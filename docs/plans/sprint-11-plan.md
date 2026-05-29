# Sprint 11 Plan Recommendation

## Recommended Objective
Harden Assistant financial-question ergonomics without expanding into advice, bank/card data, PDF import, arbitrary SQL, new primary pages, or uncontrolled AI behavior.

## Recommended Scope
- Add clearer no-data and multi-currency answer phrasing.
- Improve category question matching only within controlled categories.
- Add a compact Assistant-side recent answer display if it improves clarity without adding a dashboard.
- Add focused e2e coverage for one authenticated read-only spending question.
- Keep Sprint 8 restore and Sprint 9 receipt import regression tests green.

## Guardrails
- Read-only financial questions remain read-only.
- Use Tracked balance / tracked transaction wording only.
- No Available balance language.
- No bank/card linking.
- No PDF import support.
- No direct assistant database access.
- No arbitrary SQL.
- No financial advice.
- No new primary page.

## Suggested Done Criteria
- Assistant answers remain short, transparent, and sourced from user-owned tracked transactions.
- Unsupported financial advice and bank-balance prompts remain unsupported.
- Full validation passes before packaging.
