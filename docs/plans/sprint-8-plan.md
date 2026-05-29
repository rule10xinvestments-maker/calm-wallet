# Sprint 8 Plan

## Objective

Implement a narrow Undo last delete / restore transaction capability through the existing service-layer and AI tool-bound runtime.

## Scope

- Restore only a recently soft-deleted user-owned transaction.
- Keep restore auditable through `transaction_events`.
- Keep assistant restore action logged through `ai_action_logs`.
- Support natural-language `undo last`, `undo last delete`, and `restore last`.
- Keep manual restore by raw id optional and lightweight.

## Guardrails

- Keep exactly 3 protected primary pages: assistant, transactions, insights.
- Do not add PDF import support.
- Do not add bank/card linking.
- Do not add uncontrolled AI behavior.
- Do not allow direct assistant database writes.
- Do not implement generic undo.
- Do not restore updates or recategorizations.

## Implementation Plan

1. Normalize stale knowledge docs to the Sprint 7 ready baseline.
2. Add restore transaction schema and policy guard.
3. Add `TransactionService.restoreTransaction` with audit event creation.
4. Add a narrow service read helper for the latest user-owned soft-deleted transaction.
5. Add `restore_transaction` to the AI tool registry, schemas, types, executor dependencies, and result handling.
6. Map safe natural-language restore phrases to the restore flow.
7. Add unit and e2e coverage for restore success, rejection paths, runtime logging, and no-target no-mutation behavior.

## Validation Target

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`

## Done Criteria

- `undo last` restores the latest safe soft-deleted user-owned transaction.
- Restore is auditable through `transaction_events`.
- AI restore action is logged through `ai_action_logs`.
- No direct AI database write path exists.
- No generic undo was introduced.
- No new primary page was introduced.
- No PDF import or bank/card linking appeared.
