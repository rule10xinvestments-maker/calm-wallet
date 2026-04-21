"use client";

import Link from "next/link";
import { useActionState } from "react";
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
  includeFullName = false,
  initialState = initialAuthFormState,
  nextPath = null,
}: AuthFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

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
        <form action={formAction} className="space-y-4">
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

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              autoComplete={includeFullName ? "new-password" : "current-password"}
              className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:bg-white"
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
          </label>

          {state.error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</p>
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
