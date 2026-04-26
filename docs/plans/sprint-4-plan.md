# Sprint 4 Plan

## Sprint 4 objective
Complete the next bounded step of the staged import workflow on top of `xw-sprint-3-ready` without widening import directions or adding new primary pages.

Recommended next objective:
- tighten the staged import lifecycle after upload and review using the existing bounded import foundation
- keep all work limited to `receipt_image` and `csv_import`

## In scope
- bounded parser-result handoff and completion hardening
- small review-flow completion refinements using the existing Transactions page only
- read-only visibility improvements that stay inside the current app structure
- focused validation and test coverage for the next staged import lifecycle step

## Out of scope
- new primary pages
- PDF imports
- bank linking
- card linking
- uncontrolled AI behavior
- broad dashboard expansion
- architecture rewrites
- Sprint 5 work

## First implementation order
1. Start from the frozen baseline `xw-sprint-3-ready`.
2. Keep staged import directions locked to:
   - `receipt_image`
   - `csv_import`
3. Harden the next bounded parser-result and review-completion path using the existing imports service and action boundaries.
4. Reuse the existing Assistant and Transactions surfaces instead of creating new pages.
5. Add focused tests before widening any user-visible workflow.

## Guardrails
- Do not add new pages.
- Do not add PDF support.
- Do not add bank or card linking.
- Do not weaken ownership, validation, or service boundaries.
- Keep the product at exactly three primary protected pages.
