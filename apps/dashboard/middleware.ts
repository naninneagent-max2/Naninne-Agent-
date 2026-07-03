import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "hermes-agent-os-jwt-secret-2024-mundo-roberth-secure-key-64chars"
);
const COOKIE_NAME = "hermes_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/telegram/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Protected routes: /dashboard/*, /api/chat
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/chat");

  if (!isProtected) {
    return NextResponse.next();
  }

  // Check JWT cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "access") throw new Error("Invalid token type");

    // Token valid — add user info to headers for downstream use
    const response = NextResponse.next();
    response.headers.set("x-user-id", payload.sub as string);
    response.headers.set("x-user-email", payload.email as string);
    return response;
  } catch {
    // Invalid token — clear cookie and redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/chat/:path*", "/api/health", "/login"],
};
