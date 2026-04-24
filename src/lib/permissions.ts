import { auth } from "./auth";
import { Role } from "@prisma/client";

export async function getSession() {
  return await auth();
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireParent() {
  const session = await requireAuth();
  if (session.user.role !== Role.PARENT) {
    throw new Error("Forbidden: Parent role required");
  }
  return session;
}

export async function requireFamily() {
  const session = await requireAuth();
  if (!session.user.familyId) {
    throw new Error("Forbidden: Must be part of a family");
  }
  return session;
}

export async function requireParentInFamily() {
  const session = await requireParent();
  if (!session.user.familyId) {
    throw new Error("Forbidden: Must be part of a family");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || session.user.email !== adminEmail) {
    throw new Error("Forbidden: Admin access required");
  }
  return session;
}

export function isAdmin(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return !!adminEmail && email === adminEmail;
}
