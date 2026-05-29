# Known Limitations

## Data completeness
- The app only knows about transactions the user entered, imported, reviewed, or restored.
- Tracked balance can be incomplete when transactions are missing, duplicated, misdated, or still needing review.
- Insights are monthly summaries from tracked data only.

## Imports
- Receipt import is image-only and does not include OCR execution.
- CSV statement import supports a small MVP parser and review staging, not every bank format.
- Imported rows must be reviewed before they become transactions.
- PDFs are intentionally unsupported.

## Assistant
- Assistant actions are bounded to approved transaction and spending-question flows.
- The assistant does not execute arbitrary SQL, browse accounts, create categories, write budgets, or run autonomous workflows.
- Category correction memory is user-owned and controlled-category-only.

## Notifications
- Notification preferences and push subscription storage are foundation scaffolding.
- No real push delivery worker exists.
- No scheduler automation exists.
- Eligibility helpers are not connected to autonomous sending.

## Auth and environment
- Production release requires valid Supabase URL, anon key, auth redirect configuration, database migrations, storage bucket, and seed categories.
- Authenticated e2e coverage requires `.env.e2e.local` values for the Supabase test project.
