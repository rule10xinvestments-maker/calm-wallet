import type { User } from "@supabase/supabase-js";

export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-04-22T10:00:00.000Z",
    ...overrides,
  };
}
