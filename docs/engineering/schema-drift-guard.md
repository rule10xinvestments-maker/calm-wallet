# Production Schema Drift Guard

Calm Wallet has a production schema drift guard because app code can depend on Supabase migrations that are not applied automatically by a Vercel deploy.

The first guarded schema is recurring manual transactions:

- `public.recurring_rules`
- `public.transactions.recurring_rule_id`
- `public.transactions.recurring_occurrence_date`

Run the required production check before deploying app code that depends on migrations:

```powershell
npm.cmd run check:prod-schema
```

The command is read-only. It checks Supabase schema through REST/PostgREST and does not run migrations or mutate data.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The script never prints secret values. If it reports schema drift, apply the pending Supabase migrations first, then rerun the check. Do not weaken RLS or user ownership policies to make the check pass.

For local development, normal `npm.cmd run build` does not require production database access. Use `npm.cmd run check:schema` when you want an optional local check that skips cleanly if the required env vars are absent.
