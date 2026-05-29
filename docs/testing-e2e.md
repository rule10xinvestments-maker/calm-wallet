# E2E Test Environment

The default Playwright suite runs unauthenticated smoke checks without personal credentials.

Authenticated assistant capture smoke coverage is available when these test-only environment variables are set:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_TEST_EMAIL`
- `E2E_TEST_PASSWORD`

The authenticated smoke creates or updates only the configured test user, signs in through the public auth form, captures `coffee 5`, verifies it appears on Transactions, and removes that user's transactions, transaction events, and assistant runtime logs before and after the test.

Do not use personal credentials for these values.
