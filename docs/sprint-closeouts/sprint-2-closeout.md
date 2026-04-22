# Sprint 2 Closeout

## Sprint verdict
Ready

## Sprint objective
Expand the trusted Assistant/runtime surface from Sprint 1 so the bounded assistant can safely:
- update transactions
- delete transactions
- recategorize transactions
- summarize spending

Also expose those actions through the existing Assistant page with the minimum safe trigger UI only.

## What shipped vs planned

### Shipped
- Assistant/runtime support for:
  - `update_transaction`
  - `delete_transaction`
  - `recategorize_transaction`
  - `summarize_spending`
- Assistant action-layer parsing for all Sprint 2 tool paths through:
  - `src/lib/actions/assistant.ts`
- Assistant request/result shaping for all Sprint 2 tool paths through:
  - `src/lib/server/assistant.ts`
- Real read-only `summarize_spending` implementation through the existing validated read path:
  - `buildAssistantToolRequest`
  - `executeAiTool`
  - `AI_TOOL_REGISTRY`
  - `TransactionService.listTransactions`
  - `buildSpendingSummaryData`
- Narrow schema hardening for Sprint 2 tool request paths:
  - `update_transaction`
  - `delete_transaction`
  - `recategorize_transaction`
  - `summarize_spending`
- Minimum safe Assistant page trigger UI inside the existing composer only
- Focused tests covering:
  - assistant action parsing
  - assistant server request/result behavior
  - AI tool invalid/allowed paths
  - read-model summary correctness
  - transaction domain/mutation boundary integrity
  - assistant composer UI wiring

### Planned and intentionally not shipped
- Open-ended natural-language chat behavior
- New pages
- Dashboard expansion
- Direct AI-to-database writes
- PDF imports
- Bank/card linking
- Sprint 3 work

## Repo truth summary

### Runtime and tool changes
- `src/domain/ai/tool-registry.ts`
  - `summarize_spending` now executes a real read-only summary instead of returning `not_implemented`
- `src/domain/ai/tool-schemas.ts`
  - Sprint 2 request paths were narrowed with strict validation where needed
- `src/domain/ai/tool-types.ts`
  - `summarize_spending` success payload now reflects a real structured summary result

### Assistant action changes
- `src/lib/actions/assistant.ts`
  - accepts:
    - `update_transaction`
    - `delete_transaction`
    - `recategorize_transaction`
    - `summarize_spending`
  - preserves `persistRuntimeLog` behavior
- `src/lib/server/assistant.ts`
  - builds validated requests for all Sprint 2 actions
  - maps bounded results into short user-facing confirmations

### UI changes
- `src/components/assistant/assistant-composer.tsx`
  - now exposes compact bounded action selection for:
    - create
    - update
    - delete
    - recategorize
    - summarize
  - shows only the minimum fields needed for the selected action
  - keeps `Show recent` on the same trusted assistant action path
- `src/components/screens/assistant-overview.tsx`
  - copy updated to reflect Sprint 2 bounded action scope

### Tests added or updated
- `src/tests/unit/assistant-composer.test.tsx`
  - covers bounded Assistant page action submission wiring
- `src/tests/unit/assistant-action.test.ts`
  - covers action-layer form parsing and runtime-log persistence behavior
- `src/tests/unit/assistant-server.test.ts`
  - covers request building, success handling, invalid payload rejection, and safe failure behavior
- `src/tests/unit/ai-tools.test.ts`
  - covers allowed-tool execution, invalid request rejection, and runtime logging
- `src/tests/unit/transactions-read-model.test.ts`
  - covers read-only spending summary correctness
- `src/tests/unit/transactions-domain.test.ts`
  - preserves domain validation coverage on the trusted transaction boundary
- `src/tests/unit/transaction-mutations.test.ts`
  - preserves validated mutation boundary coverage

### Read-model and service boundary
- `src/lib/server/transactions-read-model.ts`
  - adds pure read-only summary aggregation helper
- `src/domain/transactions/service.ts`
  - still owns all mutation execution
  - no new direct AI-to-database path introduced

## Validation results

### Sprint 2 closeout validation command
```powershell
npm.cmd run test -- --run src/tests/unit/assistant-composer.test.tsx src/tests/unit/assistant-action.test.ts src/tests/unit/assistant-server.test.ts src/tests/unit/ai-tools.test.ts src/tests/unit/transactions-read-model.test.ts src/tests/unit/transactions-domain.test.ts src/tests/unit/transaction-mutations.test.ts
```

### Result
- `7` test files passed
- `64` tests passed
- runtime logging remained covered across the assistant action and AI tool paths

## Known risks / debt / blockers

### Blockers
- None blocking Sprint 2 freeze.

### Known risks and debt
- Closeout validation was intentionally scoped to the Sprint 2 assistant/runtime/UI surface, not a full repo-wide release sweep.
- Assistant UI is intentionally bounded and operational, not conversational.
- The minimal action UI still expects explicit transaction and category identifiers instead of higher-level guided lookup.
- The product is now Sprint 2-complete within the approved scope, but broader intake/import workflow work remains for a later sprint.

## xw update instruction
Update now

Sprint 2 is safe to freeze as `xw-sprint-2-ready`.

## Next sprint start order
1. Freeze/package `xw-sprint-2-ready`.
2. Start Sprint 3 from the frozen Sprint 2 baseline only.
3. Keep the Assistant/runtime boundary unchanged unless a new sprint explicitly changes the approved tool surface.
4. Move next into staged import workflow work for supported input directions only.

## Packaging instructions for `xw-sprint-2-ready`

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
2. Confirm the Sprint 2 closeout validation has passed.
3. Create an archive named `xw-sprint-2-ready.zip`.
4. Exclude generated and dependency artifacts listed above.

### Example PowerShell archive flow
```powershell
$stage = 'C:\xw-package\xw-sprint-2-ready'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null
robocopy 'C:\xw' $stage /E /XD '.next' 'node_modules' 'playwright-results' 'test-results' 'validation-fresh' /XF 'tsconfig.tsbuildinfo' | Out-Null
Compress-Archive -Path "$stage\\*" -DestinationPath 'C:\xw-package\xw-sprint-2-ready.zip' -Force
```

### If git is available
Suggested checkpoint command:
```powershell
& 'C:\Program Files\Git\cmd\git.exe' tag -a xw-sprint-2-ready -m "Sprint 2 ready baseline"
```
