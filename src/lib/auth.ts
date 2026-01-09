import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { compare } from "bcryptjs";

type Role = "PARENT" | "KID";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: Role;
      familyId?: string | null;
    };
  }

  interface User {
    role: Role;
    familyId?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    familyId?: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          familyId: user.familyId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role;
        token.familyId = user.familyId;
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.familyId = session.familyId;
        token.role = session.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.familyId = token.familyId;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        // For OAuth providers, create user if doesn't exist
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existingUser) {
          // Create new user for Google sign-in
          const newUser = await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              role: "PARENT", // Default to PARENT for OAuth sign-ins
            },
          });
          // Update the user object with database info
          user.id = newUser.id;
          user.role = newUser.role;
          user.familyId = newUser.familyId;
        } else {
          // Update user object with existing database info
          user.id = existingUser.id;
          user.role = existingUser.role;
          user.familyId = existingUser.familyId;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});
