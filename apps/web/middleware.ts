import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_AUTH_ROUTES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

function isPublicAuthRoute(pathname: string): boolean {
  return (
    PUBLIC_AUTH_ROUTES.includes(pathname) || pathname.startsWith("/invite/")
  );
}

function validateRedirectUrl(url: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return undefined;
}

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Root page: redirect based on auth status
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(
        new URL("/dashboard/bookmarks", request.url),
      );
    } else {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
  }

  // Public auth routes: redirect authenticated users away
  if (isPublicAuthRoute(pathname) && token) {
    // For signup, respect the redirectUrl query param
    if (pathname === "/signup") {
      const redirectUrl =
        validateRedirectUrl(request.nextUrl.searchParams.get("redirectUrl")) ??
        "/dashboard/bookmarks";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.redirect(new URL("/dashboard/bookmarks", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/invite/:path*",
  ],
};
