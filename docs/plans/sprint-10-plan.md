# Sprint 10 Plan Recommendation

## Recommended Objective

Harden receipt image review ergonomics without adding OCR execution, PDF support, bank/card linking, new primary pages, or uncontrolled AI behavior.

## Recommended Scope

- Improve the existing Transactions staged import review experience for receipt candidates.
- Keep receipt candidates review-first and user-confirmed.
- Add small editing controls for candidate fields before accept only if they reuse existing validation and service-layer boundaries.
- Keep accept/reject idempotent and ownership-scoped.
- Preserve Sprint 8 `restore_transaction` behavior.

## Guardrails

- No PDF import support.
- No bank or card linking.
- No new Import primary page.
- No fake OCR confidence.
- No line-item extraction.
- No direct assistant database writes.
- No uncontrolled AI behavior.
- Imported content remains untrusted input.

## Validation Target

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e` if UI or authenticated flow is affected
