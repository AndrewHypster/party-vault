import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "@/db";
import { usersTable } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.email) {
        return false;
      }

      const fullName = user.name?.trim() ?? "";
      const [firstName = "", ...lastNameParts] = fullName.split(/\s+/);
      await getDb()
        .insert(usersTable)
        .values({
          id: user.id,
          email: user.email,
          name: fullName || user.email,
          firstName,
          lastName: lastNameParts.join(" "),
        })
        .onConflictDoUpdate({
          target: usersTable.id,
          set: {
            email: user.email,
            name: fullName || user.email,
          },
        });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
