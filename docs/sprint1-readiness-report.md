# Sprint 1 Readiness Report

## Status

Sprint 1 foundation is in a handoff-ready state for the next sprint. The repo now covers the intended shell, auth, schema, transaction domain, AI tool contract scaffolding, protected product pages, and baseline tests without expanding beyond locked scope.

## What Sprint 1 Includes

- Next.js App Router shell with exactly three protected primary pages:
  - `/assistant`
  - `/transactions`
  - `/insights`
- Public auth routes:
  - `/sign-in`
  - `/sign-up`
- Supabase Auth foundation with server/browser helpers, session guards, sign-in, sign-up, and sign-out
- Supabase/Postgres schema and seed foundation for:
  - profiles
  - categories
  - transactions
  - transaction_events
  - ai_action_logs
  - import_records
  - import_candidates
  - user_category_memory
  - budgets
  - notification_preferences
- Row-level security and per-user ownership policies on user-scoped tables
- Transaction domain types, Zod validation, policy rules, mappers, and service methods
- Audit/event scaffolding for meaningful transaction mutations
- AI tool-contract scaffolding with explicit whitelist, schemas, policy checks, registry, executor, and runtime-log payload shaping
- Thin page-level product flows:
  - controlled assistant action path
  - real transaction browsing and quick review/edit actions
  - lightweight tracked-data insights
- Baseline unit and UI tests for navigation, transaction rules, assistant execution path, AI tools, read models, mutations, and import storage helpers

## Canonical Sprint 1 Values

- Transaction sources:
  - `manual`
  - `receipt_image`
  - `csv_import`
- Review states:
  - `reviewed`
  - `pending_review`
  - `needs_attention`
- Import scope:
  - receipt image uploads
  - CSV statement uploads

Product wording may say "CSV statement", but the canonical stored import/transaction source value remains `csv_import`.

## Architecture Boundaries

- `src/app`: routing and composition only
- `src/components`: presentation only
- `src/domain`: business rules, service contracts, tool contracts
- `src/lib`: platform helpers, auth/session helpers, server integration helpers, staged import helpers
- `src/supabase`: migrations and seed data

## Intentionally Deferred

- full natural-language assistant behavior
- model orchestration or provider runtime
- PDF imports
- bank or card linking
- notification delivery
- advanced insights, anomaly detection, or forecasting
- custom categories
- onboarding/profile-completion flows
- receipt parsing and CSV mapping UX

## Known Sprint 1 Risks

- End-to-end auth and protected-route behavior is only lightly covered at the Playwright layer today.
- Import schema readiness exists, but upload/parsing flows are intentionally not implemented yet.
- AI action logging is scaffolded and persisted for the current assistant action path, but broader operational reporting is deferred.

## Recommended First Sprint 2 Tasks

1. Build staged import upload flows for receipt image and CSV statement files using the existing import tables and storage-path helper.
2. Add a first constrained parsing/review workflow that turns accepted import candidates into validated transaction service calls.
3. Expand protected end-to-end coverage for auth redirects, assistant mutations, and transaction review flows.
