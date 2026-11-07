import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const REDIRECTS: Record<string, string> = {
  "/kerala-tour-packages": "/packages",
  "/kerala-honeymoon-packages": "/packages",
  "/kerala-holiday-packages": "/packages",
  "/munnar-tour-packages": "/packages",
  "/alleppey-houseboat-packages": "/packages",
  "/wayanad-tour-packages": "/packages",
  "/thekkady-tour-packages": "/packages",
  "/kovalam-tour-packages": "/packages",
  "/cochin-tour-packages": "/packages",
  "/kumarakom-tour-packages": "/packages",
  "/vagamon-tour-packages": "/packages",
  "/athirappilly-tour-packages": "/packages",
  "/5-days-kerala-tour": "/packages",
  "/6-days-kerala-tour": "/packages",
  "/7-days-kerala-tour": "/packages",
  "/about-us": "/",
  "/contact-us": "/",
  "/enquiry": "/packages",
  "/testimonials": "/",
  "/gallery": "/blog",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const redirect = REDIRECTS[pathname.toLowerCase()];
  if (redirect) {
    return NextResponse.redirect(new URL(redirect, request.url), 301);
  }

  if (pathname === "/api/auth/callback/credentials" && request.method === "POST") {
    const ip = getClientIp(request);
    if (!rateLimit(`login:${ip}`, 900_000, 5)) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isApiAdminRoute = pathname.startsWith("/api/admin");

  if (isAdminRoute || isApiAdminRoute) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      if (isApiAdminRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = token.role as string;
    const adminRoles = ["ADMIN", "EDITOR", "CONSULTANT"];
    if (!adminRoles.includes(role)) {
      if (isApiAdminRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com https://*.unsplash.com blob:; connect-src 'self'; frame-ancestors 'none'"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
