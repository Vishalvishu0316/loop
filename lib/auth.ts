import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { SignupSchema } from "@/lib/validation";
import type { SessionUser, AppSession, UserRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: SessionUser;
  }
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    workspaceId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    workspaceId?: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }

        const isDemoAllowed = process.env.ENABLE_DEMO_LOGIN === "true" || process.env.NODE_ENV !== "production";
        const demoEmail = process.env.LOOP_DEMO_EMAIL;
        const demoPassword = process.env.LOOP_DEMO_PASSWORD;

        if (
          isDemoAllowed &&
          demoEmail &&
          demoPassword &&
          parsed.data.email === demoEmail &&
          parsed.data.password === demoPassword
        ) {
          const demoUser = await db.user.findFirst({
            where: { email: demoEmail },
            include: { workspace: true },
          });

          if (demoUser) {
            return {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name,
              role: demoUser.role,
              workspaceId: demoUser.workspaceId,
            };
          }
        }

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user) return null;

        const passwordValid = verifyPassword(parsed.data.password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;

      const workspaceId = token.workspaceId ?? "";
      session.user = {
        id: token.sub ?? session.user.id ?? "",
        email: session.user.email ?? "",
        name: session.user.name ?? "",
        role: (token.role ?? "VIEWER") as UserRole,
        workspaceId,
      };

      return {
        ...session,
        workspaceId,
      } satisfies AppSession;
    },
  },
};

export async function getAppSession(): Promise<AppSession | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const user = session.user as SessionUser;
  if (!user.workspaceId) return null;

  return {
    ...session,
    user,
    workspaceId: user.workspaceId,
  } satisfies AppSession;
}

export async function requireAppSession(): Promise<AppSession> {
  const session = await getAppSession();
  if (!session?.user) {
    const error = new Error("Unauthorized");
    (error as { status?: number }).status = 401;
    throw error;
  }
  return session;
}

export async function requireWorkspaceSession() {
  const session = await requireAppSession();
  if (!session.user.workspaceId) {
    const error = new Error("No workspace associated with user");
    (error as { status?: number }).status = 403;
    throw error;
  }
  return session;
}

export async function createUserAndWorkspace(input: {
  workspaceName: string;
  name: string;
  email: string;
  password: string;
}) {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = hashPassword(parsed.data.password);

  // ACID: Create workspace + user atomically — no orphaned workspaces on failure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return db.$transaction(async (tx: any) => {
    const workspace = await tx.workspace.create({
      data: { name: parsed.data.workspaceName },
    });

    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    });

    return { workspace, user };
  });
}

