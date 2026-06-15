import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client"; // type-only: erased, edge-safe

/**
 * Edge-safe base config shared by the middleware (route protection) and the
 * full Node-runtime instance in auth.ts. It must NOT import Prisma/bcrypt — the
 * real Credentials provider with those Node deps is added only in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // real providers are added in auth.ts (Node runtime)
  callbacks: {
    // Used by middleware: only authenticated users reach protected pages.
    authorized: ({ auth }) => !!auth?.user,
    jwt: ({ token, user }) => {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};
