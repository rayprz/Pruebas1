import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next 16 "proxy" convention (formerly middleware). Auth.js provides the
// request handler; the `authorized` callback in authConfig redirects
// unauthenticated users to /login.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect all pages. Exclude API routes (they self-authorize → 401),
  // Next internals, the login page, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
