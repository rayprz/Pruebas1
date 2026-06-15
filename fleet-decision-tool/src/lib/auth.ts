import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

/**
 * Full Auth.js instance (Node runtime). Username/password now; an OIDC provider
 * (Entra/Okta/Google) can be added to `providers` later without touching the
 * rest of the app — that is the "SSO-ready" seam.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    // To enable SSO later, add an OIDC provider here, e.g.:
    // import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
    // MicrosoftEntraID({ issuer: process.env.AUTH_OIDC_ISSUER, clientId: ..., clientSecret: ... }),
  ],
});
