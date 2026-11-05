import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/my-enquiries/:path*", "/kerala-:path*", "/munnar-:path*", "/alleppey-:path*", "/wayanad-:path*", "/thekkady-:path*", "/kovalam-:path*", "/cochin-:path*", "/kumarakom-:path*", "/vagamon-:path*", "/athirappilly-:path*", "/5-days-:path*", "/6-days-:path*", "/7-days-:path*", "/about-us", "/contact-us", "/enquiry", "/testimonials", "/gallery"],
};
