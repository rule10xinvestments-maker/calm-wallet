# MVP Release Checklist

## Release gate
Status: ready for final package freeze after Sprint 16 validation.

Recommended package label: `xw-mvp-release-candidate-1`

## Scope lock checks
- Protected primary pages are exactly `/assistant`, `/transactions`, and `/insights`.
- Public auth pages remain `/sign-in` and `/sign-up`.
- Unauthenticated protected routes redirect to sign-in.
- Authenticated public routes redirect to `/assistant`.
- No new primary pages were added.
- No PDF import support was added.
- No direct bank or card linking was added.
- No custom categories, forecasting, rule-builder UI, or accounting dashboard was added.

## Data and security checks
- RLS remains enabled for user-owned tables.
- Categories remain read-only seed data for users.
- Transaction, import, budget, category-memory, notification, and push-subscription queries remain user-scoped.
- Budget delete has an own-row delete policy.
- Push subscriptions have own-row select, insert, and update policies.
- Staged import storage remains private and user-folder scoped.

## Assistant and AI checks
- AI tool registry remains limited to the approved transaction and spending-question tools.
- AI tools remain schema-validated, policy-checked, service-layer backed, and runtime logged.
- Assistant actions do not write transactions directly; transaction writes go through `TransactionService`.
- Assistant unsupported balance copy avoids product claims and linked-account claims.
- Restore transaction remains supported and covered by tests.

## Import checks
- Receipt image uploads accept supported image MIME types only.
- Receipt PDFs remain rejected before storage and import-record creation.
- CSV statement uploads require CSV filename and compatible MIME type.
- Statement PDFs remain rejected.
- CSV rows remain untrusted parser output.
- CSV imports create review candidates only; users must accept candidates before transactions are created.

## Product copy checks
- User-facing balance copy uses Tracked balance.
- Tracked balance disclaimer remains visible in Insights.
- The app does not claim bank-balance truth or account-statement completeness.
- Empty and error states are calm, specific, and non-judgmental.

## Auth production QA
- Supabase confirmation emails depend on Email Auth confirmation settings, correct Site URL, and allowed Redirect URLs.
- Production sign-up email reliability depends on SMTP configuration. Supabase's default email provider is intended for testing and low-volume use; production should use a custom SMTP provider.
- App copy must not claim confirmation email delivery is guaranteed.

## Validation commands
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- Authenticated `.env.e2e.local` e2e when env values are available

## Release decision
All listed validation commands passed on 2026-05-03. Authenticated `.env.e2e.local` e2e also passed, including the Assistant capture, recategorize, delete, and restore regression.
