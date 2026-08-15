import type { UserRole } from "@/lib/types";
import type { SessionUser } from "@/lib/types";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3,
};

export function hasMinimumRole(user: SessionUser | undefined | null, minimum: UserRole): boolean {
  if (!user) return false;
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimum];
}

export function isAdmin(user: SessionUser | undefined | null): boolean {
  return hasMinimumRole(user, "ADMIN");
}

export function isAnalyst(user: SessionUser | undefined | null): boolean {
  return hasMinimumRole(user, "ANALYST");
}

export function canManageMembers(user: SessionUser | undefined | null): boolean {
  return isAdmin(user);
}

export function canIngestFeedback(user: SessionUser | undefined | null): boolean {
  return isAnalyst(user);
}

export function canModifyFeedback(user: SessionUser | undefined | null): boolean {
  return isAnalyst(user);
}

export function canClassifyFeedback(user: SessionUser | undefined | null): boolean {
  return isAnalyst(user);
}

export function canGenerateReports(user: SessionUser | undefined | null): boolean {
  return isAnalyst(user);
}

export function canViewData(user: SessionUser | undefined | null): boolean {
  return hasMinimumRole(user, "VIEWER");
}

export function assertRole(
  user: SessionUser | undefined | null,
  minimum: UserRole,
): asserts user is SessionUser {
  if (!hasMinimumRole(user, minimum)) {
    const error = new Error("Forbidden: insufficient permissions");
    (error as { status?: number }).status = 403;
    throw error;
  }
}

export function assertAuthenticated(
  user: SessionUser | undefined | null,
): asserts user is SessionUser {
  if (!user) {
    const error = new Error("Unauthorized");
    (error as { status?: number }).status = 401;
    throw error;
  }
}
