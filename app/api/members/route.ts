import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canManageMembers, assertRole } from "@/lib/permissions";
import { InviteMemberSchema, UpdateMemberRoleSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireWorkspaceSession();
    assertRole(session.user, "VIEWER");

    const members = await db.user.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(members);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canManageMembers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = InviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
      include: { workspace: { select: { name: true } } },
    });

    if (existing) {
      if (existing.workspaceId === session.user.workspaceId) {
        return NextResponse.json(
          {
            error: `User "${existing.name}" (${existing.email}) is already a member of your workspace with the role of ${existing.role}.`,
            isExistingUser: true,
            inCurrentWorkspace: true,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: `A user with email "${parsed.data.email}" is already registered in workspace "${existing.workspace?.name ?? "another workspace"}". Please invite a different email address.`,
          isExistingUser: true,
          inCurrentWorkspace: false,
        },
        { status: 409 },
      );
    }

    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
        role: parsed.data.role,
        workspaceId: session.user.workspaceId,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canManageMembers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const target = await db.user.findFirst({
      where: { id: userId, workspaceId: session.user.workspaceId },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (target.id === session.user.id) {
      return NextResponse.json({ error: "Cannot modify your own role" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = UpdateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const updated = await db.user.update({
      where: { id: target.id },
      data: { role: parsed.data.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canManageMembers(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const target = await db.user.findFirst({
      where: { id: userId, workspaceId: session.user.workspaceId },
    });
    if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (target.id === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    if (target.role === "ADMIN") {
      const otherAdmins = await db.user.count({
        where: {
          workspaceId: session.user.workspaceId,
          role: "ADMIN",
          id: { not: target.id },
        },
      });
      if (otherAdmins === 0) {
        return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 400 });
      }
    }

    await db.user.delete({ where: { id: target.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
