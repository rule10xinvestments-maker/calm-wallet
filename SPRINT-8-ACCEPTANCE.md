# Sprint 8 Acceptance

## Status

Accepted scope pivot: Sprint 8 is **Restore deleted transaction v1**.

Sprint 8 is not Assistant financial questions v1.

## Accepted Scope

- Restore only a recently soft-deleted user-owned transaction.
- Support natural-language restore phrases:
  - `undo last`
  - `undo last delete`
  - `restore last`
- Keep restore execution behind:
  - tool schema validation
  - policy validation
  - ownership-scoped service execution
  - transaction event auditing
  - AI runtime logging
- Keep generic undo unsupported.
- Do not restore updates or recategorizations.

## Authenticated E2E Evidence

Authenticated Supabase e2e env vars were loaded from the local e2e env file for validation.

The authenticated restore flow executed instead of skipping:

1. Create `coffee 5`.
2. Delete last transaction.
3. Undo last / restore last.
4. Verify the restored transaction is visible again in Transactions.
5. Cleanup verified for the e2e test user:
   - `transactions`: `0`
   - `transaction_events`: `0`
   - `ai_action_logs`: `0`

## Full Closeout Gate

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
  - `38` test files
  - `307` tests
- `npm run build`: passed
- `npm run test:e2e`: passed
  - `5` tests passed
  - authenticated assistant restore test executed
  - no skipped authenticated restore test

## Guardrail Confirmation

- No Sprint 9 work started.
- No new primary page added.
- No PDF import support added.
- No bank or card linking added.
- No uncontrolled AI behavior added.
- No direct assistant database write path added.
- No generic undo added.
