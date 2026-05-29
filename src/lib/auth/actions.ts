"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AuthFormState } from "@/lib/auth/form-state";
import { resolvePostAuthRedirect } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import { AUTH_SIGN_IN_PATH, getRequiredEnv } from "@/lib/auth/shared";
import { signInSchema, signUpSchema } from "@/lib/auth/validation";

function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function signInAction(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = resolvePostAuthRedirect(typeof formData.get("next") === "string" ? String(formData.get("next")) : null);
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please enter a valid email and password.",
      success: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        error: getAuthErrorMessage(error),
        success: null,
      };
    }
  } catch (error) {
    return {
      error: getAuthErrorMessage(error),
      success: null,
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUpAction(_previousState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const next = resolvePostAuthRedirect(typeof formData.get("next") === "string" ? String(formData.get("next")) : null);
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please complete the form.",
      success: null,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
        },
        emailRedirectTo: new URL(`/auth/callback?next=${encodeURIComponent(next)}`, getRequiredEnv("NEXT_PUBLIC_SITE_URL")).toString(),
      },
    });

    if (error) {
      return {
        error: getAuthErrorMessage(error),
        success: null,
      };
    }

    revalidatePath("/", "layout");

    if (data.session) {
      return {
        error: null,
        success: "Account created. You are signed in.",
        redirectTo: next,
      };
    }

    return {
      error: null,
      success:
        "Account created. Check your email to confirm your sign-up. If it does not arrive, check spam or try again in a few minutes.",
      redirectTo: null,
    };
  } catch (error) {
    return {
      error: getAuthErrorMessage(error),
      success: null,
    };
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(getAuthErrorMessage(error));
  }

  revalidatePath("/", "layout");
  redirect(AUTH_SIGN_IN_PATH);
}
