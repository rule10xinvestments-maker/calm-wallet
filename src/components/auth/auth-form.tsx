"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type AuthFormState, initialAuthFormState } from "@/lib/auth/form-state";

type AuthFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  googleAction?: (formData: FormData) => Promise<void>;
  includeFullName?: boolean;
  initialState?: AuthFormState;
  nextPath?: string | null;
};

export function AuthForm({
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  action,
  googleAction,
  includeFullName = false,
  initialState = initialAuthFormState,
  nextPath = null,
}: AuthFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.redirectTo) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.replace(state.redirectTo ?? "/assistant");
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [router, state.redirectTo]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError(null);

    if (!includeFullName) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      event.preventDefault();
      setClientError("Passwords do not match.");
    }
  }

  function PasswordField({
    autoComplete,
    label,
    name,
    visible,
    onToggle,
    toggleLabels,
  }: {
    autoComplete: string;
    label: string;
    name: string;
    visible: boolean;
    onToggle: () => void;
    toggleLabels: {
      show: string;
      hide: string;
    };
  }) {
    const Icon = visible ? EyeOff : Eye;
    const toggleLabel = visible ? toggleLabels.hide : toggleLabels.show;

    return (
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="relative block">
          <input
            autoComplete={autoComplete}
            className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
            minLength={8}
            name={name}
            placeholder="At least 8 characters"
            required
            type={visible ? "text" : "password"}
          />
          <button
            aria-label={toggleLabel}
            className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            onClick={onToggle}
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        </span>
      </label>
    );
  }

  return (
    <Card className="w-full border-white/70 bg-white/85 shadow-calm backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">
          Personal budget notebook
        </div>
        <CardTitle className="text-3xl">{title}</CardTitle>
        <CardDescription className="text-base leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {googleAction ? (
          <>
            <form action={googleAction}>
              {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
              <Button
                className="w-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                type="submit"
              >
                Continue with Google
              </Button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        ) : null}

        <form action={formAction} className="space-y-4" onSubmit={handleSubmit}>
          {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
          {includeFullName ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Full name</span>
              <input
                autoComplete="name"
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
                name="fullName"
                placeholder="Jordan Lee"
                required
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              autoComplete="email"
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </label>

          <PasswordField
            autoComplete={includeFullName ? "new-password" : "current-password"}
            label="Password"
            name="password"
            onToggle={() => setPasswordVisible((value) => !value)}
            toggleLabels={{ show: "Show password", hide: "Hide password" }}
            visible={passwordVisible}
          />

          {includeFullName ? (
            <PasswordField
              autoComplete="new-password"
              label="Confirm password"
              name="confirmPassword"
              onToggle={() => setConfirmPasswordVisible((value) => !value)}
              toggleLabels={{ show: "Show confirm password", hide: "Hide confirm password" }}
              visible={confirmPasswordVisible}
            />
          ) : null}

          {clientError || state.error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {clientError ?? state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {state.success}
            </p>
          ) : null}

          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "Please wait..." : submitLabel}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link className="font-medium text-sky-700" href={alternateHref}>
            {alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
