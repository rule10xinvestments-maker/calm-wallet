# Sprint 1 Closeout

## Sprint verdict
Ready

## Sprint objective
Create a secure, production-oriented foundation for the mobile-first AI financial notebook without widening into Sprint 2 features, uncontrolled AI behavior, import automation, or advanced insights.

## What shipped vs planned

### Shipped
- Next.js App Router shell with exactly three protected primary pages:
  - `/assistant`
  - `/transactions`
  - `/insights`
- Public auth routes:
  - `/sign-in`
  - `/sign-up`
- Supabase Auth foundation with:
  - browser and server clients
  - session utilities
  - route guards
  - callback route
  - sign-in, sign-up, and sign-out wiring
- Protected routing enforcement through middleware and server-side guards
- Sprint 1 database foundation:
  - one Postgres migration
  - controlled category seed
  - row-level security policies
  - user ownership isolation
- Transaction domain foundation:
  - types
  - Zod schemas
  - policy layer
  - mappers
  - service layer
  - audit event support for meaningful mutations
- AI runtime boundary foundation:
  - approved tool whitelist
  - tool schemas
  - tool policy checks
  - tool registry
  - safe executor
  - runtime log shaping for `ai_action_logs`
- Thin protected product flows:
  - assistant action path for create transaction and list recent transactions
  - transactions review/browse page with narrow mutation paths
  - insights page with lightweight tracked-data summaries
- Import foundation only:
  - import schema tables
  - storage-path helper
  - no fake parser or automation claims
- Test foundation:
  - unit coverage across auth redirects, AI tools, assistant server path, transaction domain/service/read models, and import storage helper
  - Playwright app-shell smoke coverage

### Planned for Sprint 1 and intentionally not shipped
- Full natural-language assistant behavior
- Assistant-driven mutation UI for all approved tools
- Receipt OCR/parsing pipeline
- CSV mapping/review workflow
- Notification delivery
- PDF imports
- Direct bank/card linking
- Advanced analytics, anomaly detection, or forecasting

## Repo truth summary

### Routes present
- Public:
  - `/sign-in`
  - `/sign-up`
- Protected:
  - `/assistant`
  - `/transactions`
  - `/insights`
- Callback:
  - `/auth/callback`

### Key services and modules present
- Auth:
  - `src/lib/auth/actions.ts`
  - `src/lib/auth/browser-client.ts`
  - `src/lib/auth/guards.ts`
  - `src/lib/auth/redirects.ts`
  - `src/lib/auth/server-client.ts`
  - `src/lib/auth/session.ts`
  - `src/lib/auth/shared.ts`
  - `src/lib/auth/validation.ts`
- Transactions:
  - `src/domain/transactions/types.ts`
  - `src/domain/transactions/schemas.ts`
  - `src/domain/transactions/policy.ts`
  - `src/domain/transactions/mappers.ts`
  - `src/domain/transactions/service.ts`
  - `src/lib/server/transaction-mutations.ts`
  - `src/lib/server/transactions-read-model.ts`
- AI runtime boundary:
  - `src/domain/ai/tool-types.ts`
  - `src/domain/ai/tool-schemas.ts`
  - `src/domain/ai/tool-policy.ts`
  - `src/domain/ai/tool-registry.ts`
  - `src/domain/ai/tool-executor.ts`
  - `src/domain/ai/runtime-log.ts`
  - `src/lib/actions/assistant.ts`
  - `src/lib/server/assistant.ts`
- Import foundation:
  - `src/lib/imports/storage.ts`

### Migrations and seed present
- Migration:
  - `src/supabase/migrations/20260421023000_sprint1_foundation.sql`
- Seed:
  - `src/supabase/seed/0001_mvp_categories.sql`

### Tests present
- Unit:
  - `src/tests/unit/ai-tools.test.ts`
  - `src/tests/unit/assistant-server.test.ts`
  - `src/tests/unit/auth-redirects.test.ts`
  - `src/tests/unit/import-storage.test.ts`
  - `src/tests/unit/navigation.test.tsx`
  - `src/tests/unit/transaction-mutations.test.ts`
  - `src/tests/unit/transactions-domain.test.ts`
  - `src/tests/unit/transactions-read-model.test.ts`
- E2E:
  - `src/tests/e2e/app-shell.spec.ts`

## Validation results

Validation was re-run from an isolated fresh folder to avoid the previously contaminated `C:\xw` dependency tree:
- clean validation folder: `C:\xw-validation-fresh`

### Commands run
1. `npm install`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`
6. `npm run test:e2e`

### Results
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: passed
- `npm run build`: passed
- `npm run test:e2e`: passed

## Known risks, debt, and blockers

### Blockers
- None blocking Sprint 1 freeze.

### Known risks and debt
- The current assistant UI is intentionally narrower than the approved tool surface. It exposes create transaction and list recent transactions only.
- The approved AI mutation tools exist behind the boundary, but mutation-focused assistant UI flows remain Sprint 2 work.
- Import foundation exists only at the schema/storage level. There is no user-facing staged import workflow yet.
- `C:\xw` itself had prior local environment contamination from locked dependencies, so clean validation proof was taken from `C:\xw-validation-fresh` instead of the live workspace tree.

## xw update instruction
Update now

Sprint 1 is safe to freeze as `xw-sprint-1-ready`.

## Next sprint start order
1. Start from the frozen Sprint 1 baseline package `xw-sprint-1-ready`.
2. Expand the assistant runtime through the already approved tools:
   - `update_transaction`
   - `delete_transaction`
   - `recategorize_transaction`
   - `summarize_spending`
3. Keep assistant mutation flows behind schema validation, policy checks, ownership enforcement, runtime logging, and transaction service execution.
4. Add only the minimal assistant UI required to expose those approved flows safely.
5. Add targeted tests for tool execution, ownership protection, validation, and audit logging.

## Packaging instructions for `xw-sprint-1-ready`

### Exclusions
Do not include:
- `.next/`
- `node_modules/`
- `playwright-results/`
- `test-results/`
- `validation-fresh/`
- `tsconfig.tsbuildinfo`

### Manual archive steps
1. Start from the repo root.
2. Confirm validation has passed.
3. Create an archive named `xw-sprint-1-ready.zip`.
4. Exclude generated and dependency artifacts listed above.

### Example PowerShell archive flow
```powershell
$stage = 'C:\xw-package\xw-sprint-1-ready'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
robocopy 'C:\xw' $stage /E /XD '.next' 'node_modules' 'playwright-results' 'test-results' 'validation-fresh' /XF 'tsconfig.tsbuildinfo' | Out-Null
Compress-Archive -Path "$stage\\*" -DestinationPath 'C:\xw-package\xw-sprint-1-ready.zip' -Force
```

### If git is available
Suggested checkpoint command:
```powershell
git tag -a xw-sprint-1-ready -m "Sprint 1 ready baseline"
```

### Git note for this freeze
The current environment is an unpacked source tree without accessible `.git` metadata or a working `git` binary on PATH, so commit SHA verification and live tag creation must be performed from the canonical checkout environment before or during formal release packaging.
