export const AUTH_REDIRECT_PATH = "/assistant";
export const AUTH_SIGN_IN_PATH = "/sign-in";
export const AUTH_SIGN_UP_PATH = "/sign-up";

export function getRequiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "NEXT_PUBLIC_SITE_URL") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
