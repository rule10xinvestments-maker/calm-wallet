import { AuthForm } from "@/components/auth/auth-form";
import { type AuthFormState } from "@/lib/auth/form-state";

type AuthScreenProps = {
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  includeFullName?: boolean;
  initialState?: AuthFormState;
  nextPath?: string | null;
};

export function AuthScreen({
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  action,
  includeFullName,
  initialState,
  nextPath,
}: AuthScreenProps) {
  return (
    <AuthForm
      action={action}
      alternateHref={alternateHref}
      alternateLabel={alternateLabel}
      description={description}
      includeFullName={includeFullName}
      initialState={initialState}
      nextPath={nextPath}
      submitLabel={submitLabel}
      title={title}
    />
  );
}
