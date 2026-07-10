import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildSignInRedirectUrl } from "@/lib/auth/redirects";
import { getRequiredEnv } from "@/lib/auth/shared";
import { PROTECTED_PATHS, PUBLIC_PATHS } from "@/lib/constants/navigation";

type CookieSetOptions = Parameters<NextResponse["cookies"]["set"]>[2];
type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSetOptions;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-auth-next", nextPath);
  const redirectToSignIn = NextResponse.redirect(
    new URL(
      buildSignInRedirectUrl({
        next: nextPath,
      }),
      request.url,
    ),
  );
  const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const cookiesToSetBuffer: CookieToSet[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          cookiesToSetBuffer.push({ name, value, options });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = user
    ? { data: { session: null } }
    : await supabase.auth.getSession();
  const authUser = user ?? session?.user ?? null;

  if (authUser) {
    requestHeaders.set("x-auth-user-id", authUser.id);
    requestHeaders.set("x-auth-user-email", authUser.email ?? "");
    requestHeaders.set("x-auth-verified", "middleware");
  } else {
    requestHeaders.delete("x-auth-user-id");
    requestHeaders.delete("x-auth-user-email");
    requestHeaders.delete("x-auth-verified");
  }

  if (isProtectedPath && !authUser) {
    cookiesToSetBuffer.forEach(({ name, value, options }) => {
      redirectToSignIn.cookies.set(name, value, options);
    });
    return redirectToSignIn;
  }

  if (isPublicPath && authUser) {
    const redirectToAssistant = NextResponse.redirect(new URL("/assistant", request.url));
    cookiesToSetBuffer.forEach(({ name, value, options }) => {
      redirectToAssistant.cookies.set(name, value, options);
    });
    return redirectToAssistant;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  cookiesToSetBuffer.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });

  return response;
}

export const config = {
  matcher: [
    "/assistant",
    "/assistant/:path*",
    "/transactions",
    "/transactions/:path*",
    "/insights",
    "/insights/:path*",
    "/admin",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
