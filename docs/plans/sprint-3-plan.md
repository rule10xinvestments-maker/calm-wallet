# Sprint 3 Plan

## Sprint 3 objective
Add the first bounded staged import workflow for already-supported input directions without changing the trusted Assistant/runtime boundary or adding new pages.

This is the recommended next objective after freezing `xw-sprint-2-ready`.

## In scope
- receipt image intake staging only
- CSV bank statement intake staging only
- import record review flow within the existing app structure
- narrow validation and storage flow improvements needed for staged imports
- focused tests for import staging and review behavior

## Out of scope
- new primary pages
- PDF receipt import
- PDF bank statement import
- direct bank linking
- direct card linking
- uncontrolled AI behavior
- forecasting, anomaly modeling, or analytics expansion
- architecture rewrites

## First implementation order
1. Start from the frozen baseline `xw-sprint-2-ready`.
2. Confirm current import tables and storage helpers remain the foundation.
3. Add the minimum reviewable staged import flow for supported inputs only.
4. Keep import-derived writes behind validation, ownership, and service-layer execution.
5. Add focused tests before widening any import UX.

## Guardrails
- Do not add new pages.
- Do not weaken the runtime boundary.
- Do not introduce PDF support.
- Do not introduce bank/card linking.
- Keep the product at exactly three primary pages.
