import { AuthScreen } from "@/components/screens/auth-screen";
import { getSafeNextPath } from "@/lib/auth/redirects";
import { type AuthFormState } from "@/lib/auth/form-state";
import { signInAction, signInWithGoogleAction } from "@/lib/auth/actions";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await redirectIfAuthenticated();
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialState: AuthFormState = {
    error: resolvedSearchParams.error ?? null,
    success: null,
  };
  const nextPath = getSafeNextPath(resolvedSearchParams.next);

  return (
    <AuthScreen
      action={signInAction}
      title="Welcome back"
      description="Review your spending, ask quick budget questions, and keep your plan in view."
      googleAction={signInWithGoogleAction}
      initialState={initialState}
      nextPath={nextPath}
      submitLabel="Sign in"
      alternateHref="/sign-up"
      alternateLabel="Create an account"
    />
  );
}
