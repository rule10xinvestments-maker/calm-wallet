# MVP Scope Lock

## Locked MVP
The MVP is a calm, tracked-data personal finance notebook with:
- Assistant capture and approved transaction actions
- Transactions review and import candidate review
- Insights monthly clarity with Tracked balance
- Optional controlled-category monthly budgets
- Receipt image import staging
- CSV bank statement import staging
- User-owned category correction memory
- Notification preference and push-subscription scaffolding

## Primary pages
The protected primary pages are locked to:
- Assistant
- Transactions
- Insights

Public auth pages remain:
- Sign in
- Sign up

## Explicitly out of scope
- PDF import support
- Direct bank or card linking
- Real push sending
- Scheduler automation
- Autonomous AI notification sending
- Uncontrolled AI behavior
- Forecasting
- Custom categories
- Rule-builder UI
- Accounting dashboard
- New primary pages
- Automatic trusted bulk import

## Assistant boundary
Assistant behavior stays bounded to approved tools, controlled schemas, authenticated user context, policy checks, service-layer execution, and runtime logs. Imported text and filenames are untrusted input and cannot expand assistant capability.

## Balance boundary
Tracked balance is computed only from user-owned tracked transactions. It is not account truth, not an external institution balance, and not a substitute for account statements.
