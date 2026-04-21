# Sprint 2 Plan

## Sprint 2 objective
Expand the existing Assistant runtime into the first safe mutation-capable AI-first notebook loop by wiring only approved tools through the current validation, policy, ownership, audit, and service-layer boundaries.

## In scope
- `update_transaction`
- `delete_transaction`
- `recategorize_transaction`
- `summarize_spending`
- minimal assistant UI required to expose those approved actions safely
- targeted tests for:
  - tool calls
  - ownership
  - validation
  - audit logging

## Out of scope
- new primary pages
- PDF imports
- bank/card linking
- uncontrolled agent behavior
- architecture rewrites
- direct AI-to-database writes
- import automation expansion
- advanced analytics expansion beyond the narrow `summarize_spending` contract

## First implementation order
1. Confirm the approved Sprint 2 tool surface and keep the whitelist explicit:
   - `update_transaction`
   - `delete_transaction`
   - `recategorize_transaction`
   - `summarize_spending`
2. Align assistant-side request/response shaping with the existing tool executor and transaction service boundaries.
3. Add the minimal assistant runtime wiring required to trigger those approved tools safely from the Assistant page.
4. Keep all execution behind:
   - schema validation
   - policy validation
   - authenticated ownership context
   - transaction service methods
   - AI runtime logging
5. Add concise confirmation and uncertainty messaging in the assistant flow without widening permissions or pretending there is uncontrolled autonomy.
6. Add targeted tests for:
   - allowed tool execution
   - denied/invalid tool paths
   - ownership preservation
   - audit and runtime log behavior

## Guardrails
- Do not add new product scope.
- Do not weaken the AI runtime boundary.
- Do not bypass the transaction service.
- Do not add uncontrolled tools.
- Do not add PDF imports or bank/card linking.
- Keep the product at exactly three primary pages.
