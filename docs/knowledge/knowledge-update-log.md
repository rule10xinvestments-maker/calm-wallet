# Knowledge Update Log Compatibility Entry

The canonical running knowledge log remains:

- `docs/knowledge/knowledge_update_log.md`

## Sprint 9 Closeout Update

### Date
2026-05-02

### Status
Ready

### Add this to my knowledge now
- Sprint 9 is ready as Receipt Image Import MVP.
- Receipt image uploads are authenticated, private, MIME-limited, size-limited, filename-sanitized, and user-scoped.
- Receipt candidates are staged only for usable data and remain review-first.
- Imported content is untrusted and cannot alter AI/runtime/tool policy.
- No PDF import, bank/card linking, new primary page, fake OCR confidence, or line-item extraction was added.

---

## Sprint 10 Closeout Update

### Date
2026-05-02

### Status
Ready

### Add this to my knowledge now
- Sprint 10 is ready as Assistant Spending Questions v1.
- Assistant financial questions are read-only, ownership-scoped, schema-validated, policy-validated, service-backed, and runtime-logged.
- Supported intents are monthly spending total, monthly income total, category spending total, recent largest expense, needs-review summary, and recent transactions summary.
- Assistant answers use Tracked wording, not Available balance or bank-balance wording.
- No PDF import, bank/card linking, new primary page, arbitrary SQL, financial advice, direct assistant DB access, or uncontrolled AI behavior was added.

---

## Sprint 11 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 11 is ready as Insights Page v1: Monthly Clarity Layer.
- Insights uses tracked user-owned transaction data only.
- Insights shows monthly spending, monthly income, Tracked balance, category breakdown, largest recent expenses, and Needs Review count.
- Insights includes empty and low-data states.
- No Available balance wording, bank-balance claim, accounting dashboard, PDF import, bank/card linking, new primary page, direct assistant DB access, or uncontrolled AI behavior was added.

---

## Sprint 12 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 12 is ready as Budget Setup v1.
- Budgets are optional monthly controlled-category budgets surfaced only in Insights.
- Budget progress shows budget amount, actual spending, remaining amount, percent used, and over-budget state.
- Budget removal deletes the user-owned budget row because the schema has no active or soft-delete column.
- No custom categories, rollover budgets, envelope budgeting, forecasting, Assistant budget-writing tool, PDF import, bank/card linking, new primary page, Available balance wording, or uncontrolled AI behavior was added.

---

## Sprint 13 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 13 is ready as CSV Bank Statement Import MVP.
- CSV uploads are authenticated, private, MIME-limited, size-limited, filename-sanitized, and user-scoped.
- CSV rows are parsed with bounded limits and staged only as review candidates.
- Duplicate CSV rows and same-user existing transaction matches are skipped before candidate staging.
- Existing Transactions review/accept/reject remains the review surface.
- No PDF import, bank/card linking, new primary page, automatic trusted bulk import, Available balance wording, direct assistant database access, or uncontrolled AI behavior was added.

---

## Sprint 14 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 14 is ready as Category Correction Memory v1.
- Category memory is user-owned, controlled-category-only, and stored in `user_category_memory`.
- Memory is recorded from user-approved correction paths.
- Strong memory matches can suggest categories for Assistant capture, receipt candidate staging, and CSV candidate staging.
- Weak matches remain reviewable.
- No custom categories, rule-builder UI, global learning, model training, PDF import, bank/card linking, new primary page, Available balance wording, or uncontrolled AI behavior was added.

---

## Sprint 15 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 15 is ready as Notifications Foundation v1.
- Notification preferences are user-owned, service-backed, and surfaced in the existing Assistant page.
- Push subscription storage scaffolding exists with user-owned RLS and disable support.
- Daily reminder and monthly review eligibility helpers include suppression states.
- Notification copy templates are calm and non-judgmental.
- No real push delivery, scheduler, autonomous AI notification sending, new primary page, PDF import, bank/card linking, Available balance wording, or uncontrolled AI behavior was added.

---

## Sprint 16 Closeout Update

### Date
2026-05-03

### Status
Ready

### Add this to my knowledge now
- Sprint 16 is MVP Hardening / Release Readiness on top of `xw-sprint-15-ready`.
- Protected primary pages remain exactly Assistant, Transactions, and Insights.
- Public auth pages remain sign-in and sign-up, with protected/public redirect behavior preserved.
- AI tools remain limited to the approved registry and stay schema/policy/service-layer bound.
- Assistant does not directly write transactions outside the transaction service path.
- Receipt image and CSV imports remain private, user-scoped, MIME/size limited, and review-first.
- Receipt PDFs and statement PDFs remain rejected.
- CSV import remains staged and user-reviewed, not auto-trusted.
- Budgets remain optional and controlled-category-only.
- Notifications remain preference/scaffold only, with no real delivery worker or scheduler.
- Sprint 16 added release docs, scope lock docs, known limitations, copy hardening, empty-state polish, and mobile wrapping hardening.
- Full validation passed, including authenticated e2e restore regression.
- Recommended final MVP package label: `xw-mvp-release-candidate-1`.
