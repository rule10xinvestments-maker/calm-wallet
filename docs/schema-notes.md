# Sprint 1 Schema Notes

## Scope

This schema sets up the Sprint 1 data foundation for a mobile-first AI financial notebook with:

- controlled categories only
- user-owned transactions with soft delete
- staged imports before trust
- auditable AI-related operations
- minimal structural support for budgets and notification preferences

## Key Decisions

- `transactions.amount_minor` is required and positive because amount is the core money field.
- `transactions.transaction_type` is required, which ensures expense or income intent exists before a real transaction is created.
- `transactions.source` stays canonical as `manual`, `receipt_image`, or `csv_import` across schema, domain types, actions, and tests.
- review states stay canonical as `reviewed`, `pending_review`, and `needs_attention`, with UI labels mapped separately.
- `import_candidates` allows nullable amount, type, date, and category fields so uncertain extracted items can be represented before acceptance.
- `transactions.deleted_at` provides soft delete instead of hard deletion.
- `categories` is system-controlled and readable through RLS, but not writable by normal users.
- `transaction_events` and `ai_action_logs` preserve audit history without hiding core product state inside JSON blobs.
- `profiles` and `notification_preferences` are auto-created for new auth users via a database trigger.

## Deferred On Purpose

- custom user categories
- bank or card linking
- PDF import handling
- notification delivery mechanics
- forecasting or analytics materializations
- service-layer write logic

## Operational Note

The schema assumes meaningful writes will later be mediated by validated service-layer logic. The tables added here make that possible, but they do not implement those services yet.

## Import Storage Note

Sprint 1 import metadata is designed for staged storage under a user-scoped path such as:

- `imports/{user_id}/receipt_image/{yyyy}/{mm}/{timestamp}-{filename}`
- `imports/{user_id}/csv_import/{yyyy}/{mm}/{timestamp}-{filename}`

This keeps uploaded receipt images and CSV statements isolated by owner and import type before any trusted transaction creation happens.
