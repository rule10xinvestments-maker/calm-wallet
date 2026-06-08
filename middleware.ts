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

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
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

  if (isProtectedPath && !authUser) {
    return redirectToSignIn;
  }

  if (isPublicPath && authUser) {
    return NextResponse.redirect(new URL("/assistant", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/assistant/:path*", "/transactions/:path*", "/insights/:path*", "/sign-in", "/sign-up"],
};
