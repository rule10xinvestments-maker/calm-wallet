alter table public.profiles
  add column if not exists accepted_terms_version text,
  add column if not exists accepted_privacy_version text,
  add column if not exists accepted_refund_version text,
  add column if not exists accepted_ai_version text,
  add column if not exists legal_accepted_at timestamptz;

create index if not exists idx_profiles_legal_acceptance
  on public.profiles (
    accepted_terms_version,
    accepted_privacy_version,
    accepted_refund_version,
    accepted_ai_version
  );
