import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");
  const isLoginPage = nextUrl.pathname === "/login";

  // Redirect unauthenticated users from /admin/* to /login
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Redirect authenticated users away from /login
  if (isLoginPage && isLoggedIn) {
    const role = session?.user?.role;
    const dest = role === "STAFF" ? "/admin/calendar" : "/admin/dashboard";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // Staff can only access calendar and booking detail
  if (isAdminRoute && isLoggedIn) {
    const role = session?.user?.role;
    if (role === "STAFF") {
      const allowedStaffPaths = ["/admin/calendar", "/admin/bookings/"];
      const isAllowed = allowedStaffPaths.some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      if (!isAllowed) {
        return NextResponse.redirect(new URL("/admin/calendar", nextUrl));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
