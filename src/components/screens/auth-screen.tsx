import { AuthForm } from "@/components/auth/auth-form";
import { type AuthFormState } from "@/lib/auth/form-state";

type AuthScreenProps = {
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  copyKeyPrefix?: "signIn" | "signUp";
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  googleAction?: (formData: FormData) => Promise<void>;
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
  copyKeyPrefix,
  action,
  googleAction,
  includeFullName,
  initialState,
  nextPath,
}: AuthScreenProps) {
  return (
    <AuthForm
      action={action}
      alternateHref={alternateHref}
      alternateLabel={alternateLabel}
      copyKeyPrefix={copyKeyPrefix}
      description={description}
      googleAction={googleAction}
      includeFullName={includeFullName}
      initialState={initialState}
      nextPath={nextPath}
      submitLabel={submitLabel}
      title={title}
    />
  );
}
