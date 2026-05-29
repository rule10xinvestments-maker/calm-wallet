# xw Version Log Compatibility Entry

The canonical release log remains:

- `docs/releases/xw_version_log.md`

## Release: `xw-sprint-9-ready`

### Date
2026-05-02

### Sprint
Sprint 9

### Status
Ready

### Included in this snapshot
- Receipt-specific server upload path with private user-scoped storage.
- Receipt MIME/PDF rejection hardening.
- Receipt candidate staging for owned receipt image records.
- Existing Transactions review/accept/reject flow.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-12-ready`

### Date
2026-05-03

### Sprint
Sprint 12

### Status
Ready

### Included in this snapshot
- Budget Setup v1 for optional monthly controlled-category budgets.
- Budget domain schemas, policy, service, authenticated actions, and own-row delete RLS policy.
- Insights budget progress with amount, actual spending, remaining, percent used, and over-budget state.
- Compact budget controls inside the existing Insights page.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-11-ready`

### Date
2026-05-03

### Sprint
Sprint 11

### Status
Ready

### Included in this snapshot
- Insights Page v1 as a monthly clarity layer.
- Monthly tracked spending, monthly tracked income, Tracked balance, category breakdown, largest recent expenses, and Needs Review count.
- Empty and low-data Insights states.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-10-ready`

### Date
2026-05-02

### Sprint
Sprint 10

### Status
Ready

### Included in this snapshot
- Read-only `answer_financial_question` Assistant tool.
- Monthly spending, monthly income, category spending, recent largest expense, needs-review summary, and recent transactions summary intents.
- Ownership-scoped service-layer transaction reads.
- Runtime logging and Tracked-data wording.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-13-ready`

### Date
2026-05-03

### Sprint
Sprint 13

### Status
Ready

### Included in this snapshot
- CSV Bank Statement Import MVP.
- Private user-scoped CSV upload path.
- Safe bounded CSV parser and review-first candidate staging.
- Duplicate safeguards before staging.
- Existing Transactions review/accept/reject surface.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-14-ready`

### Date
2026-05-03

### Sprint
Sprint 14

### Status
Ready

### Included in this snapshot
- Category Correction Memory v1.
- User-owned merchant, phrase, and import-description category memory.
- Controlled-category validation for correction memory.
- Strong memory reuse in Assistant capture, receipt staging, and CSV staging.
- Weak matches remain reviewable.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-sprint-15-ready`

### Date
2026-05-03

### Sprint
Sprint 15

### Status
Ready

### Included in this snapshot
- Notifications Foundation v1.
- User-owned notification preferences in the existing Assistant page.
- Push subscription storage scaffolding with owner-scoped RLS and disable support.
- Daily reminder and monthly review eligibility/suppression helpers.
- Calm non-judgmental notification copy templates.
- Full validation passed, including authenticated e2e restore regression.

---

## Release: `xw-mvp-release-candidate-1`

### Date
2026-05-03

### Sprint
Sprint 16

### Status
Ready

### Included in this snapshot
- MVP Hardening / Release Readiness on top of `xw-sprint-15-ready`.
- Final release checklist, MVP scope lock, known limitations, and Sprint 16 closeout docs.
- Protected route, public auth route, AI registry, RLS, imports, budgets, notifications, copy, and e2e audit record.
- Mobile wrapping polish for transaction and staged import rows.
- Clearer empty states for transaction misses and staged imports.
- Assistant unsupported linked-account balance wording hardened without adding new behavior.
- Full validation passed, including authenticated e2e restore regression.
- No new features, pages, PDF import, bank/card linking, real push sending, scheduler, forecasting, custom categories, or uncontrolled AI behavior.
