import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/auth/server-client";
import {
  buildSignInRedirectUrl,
  getAuthCallbackErrorMessage,
  resolvePostAuthRedirect,
} from "@/lib/auth/redirects";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const callbackError = requestUrl.searchParams.get("error");

  if (callbackError || !code) {
    return NextResponse.redirect(
      new URL(
        buildSignInRedirectUrl({
          next,
          error: getAuthCallbackErrorMessage(),
        }),
        request.url,
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(
        buildSignInRedirectUrl({
          next,
          error: getAuthCallbackErrorMessage(),
        }),
        request.url,
      ),
    );
  }

  return NextResponse.redirect(new URL(resolvePostAuthRedirect(next), request.url));
}
