# Sprint 15 Closeout

## Sprint verdict
Ready

## Sprint objective
Deliver Notifications Foundation v1 on top of `xw-sprint-14-ready`, preserving accepted restore, receipt import, Assistant spending questions, Insights, budgets, CSV import, and category correction memory baselines.

Sprint 15 stayed limited to:
- user-controlled notification preferences
- push subscription storage scaffolding
- eligibility and suppression helpers
- calm notification copy templates
- no real push sending or autonomous notification behavior

## What shipped
- Added notification domain schemas, types, service-layer functions, eligibility helpers, and calm copy templates.
- Added a private `push_subscriptions` table migration with user ownership, RLS policies, endpoint uniqueness per user, and disable scaffolding.
- Added Supabase-backed notification preference reads and updates using the existing `notification_preferences` table.
- Added push subscription register/disable service functions without sending real notifications.
- Added authenticated server actions for preference updates and subscription registration.
- Added compact notification preference controls inside the existing Assistant page.
- Preserved the locked three protected primary pages: Assistant, Transactions, and Insights.

## Intentionally not shipped
- New primary pages
- Real push delivery
- Autonomous AI notification sending
- Spammy, urgent, or shame-based notification language
- PDF import support
- Bank or card linking
- Bank-balance claims
- Available balance wording
- Uncontrolled AI behavior

## Files changed summary

### Notification domain and storage
- `C:\xw\src\domain\notifications\copy.ts`
- `C:\xw\src\domain\notifications\schemas.ts`
- `C:\xw\src\domain\notifications\service.ts`
- `C:\xw\src\domain\notifications\types.ts`
- `C:\xw\src\lib\db\types.ts`
- `C:\xw\src\supabase\migrations\20260503002000_sprint15_push_subscriptions.sql`

### Server actions and UI
- `C:\xw\src\lib\actions\notifications-state.ts`
- `C:\xw\src\lib\actions\notifications.ts`
- `C:\xw\src\components\notifications\notification-preferences-card.tsx`
- `C:\xw\src\components\screens\assistant-overview.tsx`
- `C:\xw\src\app\(protected)\assistant\page.tsx`

### Tests
- `C:\xw\src\tests\unit\notifications-domain.test.ts`
- `C:\xw\src\tests\unit\notifications-action.test.ts`
- `C:\xw\src\tests\unit\assistant-overview.test.tsx`

## Validation results

Final Sprint 15 validation on 2026-05-03:

- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed
  - `51` test files passed
  - `381` tests passed
- `npm.cmd run build`: passed
- `npm.cmd run test:e2e`: passed
  - default unauthenticated run: `4` passed, `1` authenticated test skipped because env was not loaded
  - authenticated env run with `.env.e2e.local`: `5` passed
  - Sprint 8 restore regression executed and passed in the authenticated run

Focused Sprint 15 validation also passed:
- `3` test files passed
- `10` tests passed

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 15 closeout.

### Known risks and seams
- Real push delivery is intentionally not implemented.
- Browser push permission and client-side subscription capture are scaffolding-adjacent, not a full user flow.
- Notification preferences currently cover daily reminder and monthly review controls; older preference columns for overspending, unusual spending, and savings opportunities remain schema defaults but are not surfaced as Sprint 15 behavior.
- Eligibility helpers are pure service-layer logic; no scheduler or delivery worker exists yet.
- Profile `notifications_opt_in` remains an existing profile default and was not expanded into a separate profile settings surface.

## xw update instruction
Update now.

Sprint 15 is safe to freeze as `xw-sprint-15-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-15-ready`.
2. Start Sprint 16 only from the frozen Sprint 15 baseline.
3. Preserve user-controlled notification behavior, no real push sending unless explicitly scoped, and all prior sprint guardrails.
4. Do not add PDF import, bank/card linking, new primary pages, Available balance wording, bank-balance claims, autonomous AI sending, or uncontrolled AI behavior.
