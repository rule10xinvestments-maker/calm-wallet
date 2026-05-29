import { AuthScreen } from "@/components/screens/auth-screen";
import { getSafeNextPath } from "@/lib/auth/redirects";
import { signUpAction } from "@/lib/auth/actions";
import { redirectIfAuthenticated } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type SignUpPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  await redirectIfAuthenticated();
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = getSafeNextPath(resolvedSearchParams.next);

  return (
    <AuthScreen
      action={signUpAction}
      title="Create your notebook"
      description="Start with a simple spending home designed for calm daily check-ins."
      includeFullName
      nextPath={nextPath}
      submitLabel="Sign up"
      alternateHref="/sign-in"
      alternateLabel="Already have an account?"
    />
  );
}
