# Sprint 14 Plan Recommendation

## Recommended Objective
Harden CSV Bank Statement Import MVP with clearer review ergonomics and parser observability without expanding into bank linking or accounting-dashboard scope.

## Recommended Scope
- Add compact user-facing copy for CSV parse results: staged, skipped, duplicate, and failed rows.
- Consider persisting safe row-level skip summaries if the existing schema can support it without raw-content overexposure.
- Add a small CSV sample-format hint in the existing Assistant upload area.
- Improve duplicate review affordances only inside the existing Transactions staged import card.
- Add authenticated e2e coverage for uploading a small CSV and accepting one candidate if test storage setup is stable.

## Guardrails
- No new primary page.
- No PDF import support.
- No direct bank or card linking.
- No bank-balance claims.
- No Available balance wording.
- No automatic trusted bulk import.
- No arbitrary SQL.
- No direct assistant database access.
- No uncontrolled AI behavior.
- Keep CSV content treated as untrusted input.

## Suggested Done Criteria
- CSV import remains private, staged, and review-first.
- Users can understand why rows were skipped without exposing unsafe raw content.
- Sprint 8 restore, Sprint 9 receipt import, Sprint 10 Assistant read questions, Sprint 11 Insights, and Sprint 12 budget regressions remain green.
- Full validation passes before packaging.
