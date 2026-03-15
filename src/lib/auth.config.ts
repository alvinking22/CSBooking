import type { NextAuthConfig } from "next-auth";

// Thin auth config for use in middleware (Edge Runtime — no Prisma allowed).
// The full auth.ts uses this config and adds the Credentials provider.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.firstName = (user as { firstName?: string }).firstName;
        token.lastName = (user as { lastName?: string }).lastName;
        token.isActive = (user as { isActive?: boolean }).isActive;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.isActive = token.isActive as boolean;
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
};
