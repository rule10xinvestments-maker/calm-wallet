"use client";

import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/features";
import { createSupabaseBrowserClient } from "@/lib/auth/browser-client";
import { type AuthFormState, initialAuthFormState } from "@/lib/auth/form-state";
import { buildGoogleOAuthRedirectTo } from "@/lib/auth/oauth-redirect";
import { normalizeLocale, supportedLocales, t, type SupportedLocale } from "@/lib/i18n";
import { getLocaleFlagLabel } from "@/lib/locale-flags";

type AuthFormProps = {
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
  emailPasswordAuthEnabled?: boolean;
};

type PasswordFieldProps = {
  autoComplete: string;
  label: string;
  name: string;
  placeholder: string;
  visible: boolean;
  onToggle: () => void;
  toggleLabels: {
    show: string;
    hide: string;
  };
};

export function AuthForm({
  title,
  description,
  submitLabel,
  alternateHref,
  alternateLabel,
  copyKeyPrefix,
  action,
  googleAction,
  includeFullName = false,
  initialState = initialAuthFormState,
  nextPath = null,
  emailPasswordAuthEnabled = EMAIL_PASSWORD_AUTH_ENABLED,
}: AuthFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [googleOAuthRedirectTo, setGoogleOAuthRedirectTo] = useState<string | null>(null);
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const resolvedTitle = copyKeyPrefix ? t(`auth.${copyKeyPrefix}.title`, locale) : title;
  const resolvedDescription = copyKeyPrefix ? t(`auth.${copyKeyPrefix}.description`, locale) : description;
  const resolvedSubmitLabel = copyKeyPrefix ? t(`auth.${copyKeyPrefix}.submit`, locale) : submitLabel;
  const resolvedAlternateLabel = copyKeyPrefix ? t(`auth.${copyKeyPrefix}.alternate`, locale) : alternateLabel;

  useEffect(() => {
    setGoogleOAuthRedirectTo(
      buildGoogleOAuthRedirectTo({
        isNativeShell: Capacitor.isNativePlatform() || Capacitor.getPlatform() === "android",
        nextPath,
        origin: window.location.origin,
      }),
    );
  }, [nextPath]);

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
      setClientError(t("auth.errors.passwordsDoNotMatch", locale));
    }
  }

  async function handleGoogleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!googleOAuthRedirectTo?.startsWith("com.calmwallet.app://")) {
      return;
    }

    event.preventDefault();
    setClientError(null);
    setIsGooglePending(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: googleOAuthRedirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        setClientError("We couldn't complete your sign-in. Please try again.");
        setIsGooglePending(false);
        return;
      }

      await Browser.open({ url: data.url });
    } catch {
      setClientError("We couldn't complete your sign-in. Please try again.");
      setIsGooglePending(false);
    }
  }

  return (
    <Card className="w-full border-white/70 bg-white/85 shadow-calm backdrop-blur">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="inline-flex max-w-full rounded-full bg-sky-50 px-3 py-1 text-sm font-medium leading-5 text-sky-700">
            <span>{t("auth.productPill", locale)}</span>
          </div>
          <AuthLanguageSelector />
        </div>
        <CardTitle className="text-3xl">{resolvedTitle}</CardTitle>
        <CardDescription className="text-base leading-6">{resolvedDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        {googleAction ? (
          <>
            <form action={googleAction} onSubmit={handleGoogleSubmit}>
              {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
              {googleOAuthRedirectTo ? <input name="oauthRedirectTo" type="hidden" value={googleOAuthRedirectTo} /> : null}
              <Button
                className="w-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                disabled={!googleOAuthRedirectTo || isGooglePending}
                type="submit"
              >
                <span
                  aria-hidden="true"
                  className="size-5 shrink-0 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: "url('/icons/google-g.svg')" }}
                />
                <span className="min-w-0 truncate">{isGooglePending ? t("auth.pleaseWait", locale) : t("auth.continueWithGoogle", locale)}</span>
              </Button>
            </form>
            {clientError ? (
              <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {translateAuthMessage(clientError, locale)}
              </p>
            ) : null}
            <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>{t("auth.or", locale)}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        ) : null}

        {emailPasswordAuthEnabled ? (
          <>
            <form action={formAction} className="space-y-4" onSubmit={handleSubmit}>
              {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
              {includeFullName ? (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">{t("auth.fullName", locale)}</span>
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
                <span className="text-sm font-medium text-slate-700">{t("auth.email", locale)}</span>
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
                label={t("auth.password", locale)}
                name="password"
                onToggle={() => setPasswordVisible((value) => !value)}
                placeholder={t("auth.passwordPlaceholder", locale)}
                toggleLabels={{ show: t("auth.showPassword", locale), hide: t("auth.hidePassword", locale) }}
                visible={passwordVisible}
              />

              {includeFullName ? (
                <PasswordField
                  autoComplete="new-password"
                  label={t("auth.confirmPassword", locale)}
                  name="confirmPassword"
                  onToggle={() => setConfirmPasswordVisible((value) => !value)}
                  placeholder={t("auth.passwordPlaceholder", locale)}
                  toggleLabels={{ show: t("auth.showConfirmPassword", locale), hide: t("auth.hideConfirmPassword", locale) }}
                  visible={confirmPasswordVisible}
                />
              ) : null}

              {emailPasswordAuthEnabled && (clientError || state.error) ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {translateAuthMessage(clientError ?? state.error, locale)}
                </p>
              ) : null}

              {state.success ? (
                <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {translateAuthMessage(state.success, locale)}
                </p>
              ) : null}

              <Button className="w-full" disabled={isPending} type="submit">
                {isPending ? t("auth.pleaseWait", locale) : resolvedSubmitLabel}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-slate-500">
              <Link className="font-medium text-sky-700" href={alternateHref}>
                {resolvedAlternateLabel}
              </Link>
            </p>
          </>
        ) : (
          <EmailPasswordComingSoon locale={locale} />
        )}
        <PwaInstallButton />
      </CardContent>
    </Card>
  );
}

function EmailPasswordComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 px-3.5 py-3.5 text-slate-700 shadow-sm">
      <div className="flex items-start gap-3.5">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <span
            aria-hidden="true"
            className="size-10 rounded-md bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/icons/calm-wallet-icon-192.png')" }}
          />
          <span className="rounded-full border border-sky-100 bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-500">
            {t("auth.emailPasswordComingSoon.status", locale)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5 text-slate-800">{t("auth.emailPasswordComingSoon.title", locale)}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{t("auth.emailPasswordComingSoon.helper", locale)}</p>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  autoComplete,
  label,
  name,
  placeholder,
  visible,
  onToggle,
  toggleLabels,
}: PasswordFieldProps) {
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
          placeholder={placeholder}
          required
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={toggleLabel}
          className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          onClick={onToggle}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
      </span>
    </label>
  );
}

function AuthLanguageSelector() {
  const { locale, setLocale } = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedLanguage = getLocaleFlagLabel(locale);

  return (
    <div className="relative shrink-0">
      <button
        aria-expanded={isExpanded}
        aria-label={t("settings.language", locale)}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        onClick={() => setIsExpanded((value) => !value)}
        type="button"
      >
        <span aria-hidden="true">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.code}</span>
        <ChevronDown aria-hidden="true" className={`size-3.5 text-slate-400 transition ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded ? (
        <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {supportedLocales.map((option) => {
            const normalizedOption = normalizeLocale(option);
            const isSelected = normalizedOption === locale;
            const language = getLocaleFlagLabel(normalizedOption);

            return (
              <button
                aria-pressed={isSelected}
                className={`flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition ${
                  isSelected ? "bg-sky-50 text-sky-800" : "text-slate-700 hover:bg-slate-50"
                }`}
                key={option}
                onClick={() => {
                  setLocale(normalizedOption);
                  setIsExpanded(false);
                }}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">{language.flag}</span>
                  <span>{language.name}</span>
                </span>
                {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function translateAuthMessage(message: string | null | undefined, locale: SupportedLocale) {
  if (!message) {
    return "";
  }

  const messageKeys: Record<string, string> = {
    "Passwords do not match.": "auth.errors.passwordsDoNotMatch",
    "Enter a valid email address.": "auth.errors.validEmail",
    "Password must be at least 8 characters.": "auth.errors.passwordLength",
    "Full name must be at least 2 characters.": "auth.errors.fullNameLength",
    "Please enter a valid email and password.": "auth.errors.validEmailAndPassword",
    "Please complete the form.": "auth.errors.completeForm",
    "Something went wrong. Please try again.": "auth.errors.generic",
    "Account created. You are signed in.": "auth.success.accountCreatedSignedIn",
    "Account created. Check your email to confirm your sign-up. If it does not arrive, check spam or try again in a few minutes.":
      "auth.success.checkEmail",
    "We couldn't complete your sign-in. Please try again.": "auth.errors.signInFailed",
  };
  const key = messageKeys[message];

  return key ? t(key, locale) : message;
}
