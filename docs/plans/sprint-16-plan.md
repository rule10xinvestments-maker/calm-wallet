# Sprint 16 Plan Recommendation

## Recommended Objective
Add a safe notification delivery preparation layer without sending real notifications by default.

## Recommended Scope
- Add a small notification event/audit table if needed for future delivery attempts and suppression evidence.
- Add service-layer scheduling helpers that select eligible users for daily reminders and monthly reviews without sending.
- Add a dry-run notification preview action for tests or internal validation only.
- Keep notification copy templates centralized and calm.
- Add tests for eligibility selection, suppression persistence, disabled users, duplicate prevention, and dry-run output.

## Guardrails
- No real push sending unless explicitly scoped with safe env/config/test support.
- No autonomous AI notification sending.
- No spammy, urgent, or shame-based language.
- No new primary page.
- No PDF import support.
- No bank/card linking.
- No Available balance wording.
- No bank-balance claims.
- No uncontrolled AI behavior.

## Suggested Done Criteria
- Notification preferences and subscription scaffolding remain user-owned and service-layer only.
- Delivery preparation can be tested without contacting external push services.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, Sprint 12 budgets, Sprint 13 CSV import, Sprint 14 category memory, and Sprint 15 notification preference regressions remain green.
- Full validation passes before packaging.
