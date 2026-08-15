import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canModifyFeedback, canViewData, canClassifyFeedback } from "@/lib/permissions";
import { FeedbackUpdateSchema } from "@/lib/validation";
import { reclassifyExistingFeedback } from "@/lib/feedback-ops";
import { apiError } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const feedback = await db.feedback.findFirst({
      where: { id, workspaceId: session.user.workspaceId },
      include: {
        themeLinks: { include: { theme: true } },
      },
    });

    if (!feedback) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(feedback);
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireWorkspaceSession();
    if (!canModifyFeedback(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const parsed = FeedbackUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const existing = await db.feedback.findFirst({
      where: { id, workspaceId: session.user.workspaceId },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await db.feedback.update({
      where: { id },
      data: { ...parsed.data },
      include: { themeLinks: { include: { theme: true } } },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireWorkspaceSession();
    const { id } = await params;
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "reclassify") {
      if (!canClassifyFeedback(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

      const existing = await db.feedback.findFirst({
        where: { id, workspaceId: session.user.workspaceId },
      });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const existingThemes = await db.theme.findMany({
        where: { workspaceId: session.user.workspaceId },
        select: { id: true, name: true, slug: true },
      });

      // ACID: Atomic reclassify + delete old links + create new links
      const fresh = await reclassifyExistingFeedback(
        existing.id,
        existing.content,
        session.user.workspaceId,
        existingThemes,
      );

      return NextResponse.json(fresh);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return apiError(e);
  }
}
