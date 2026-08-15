import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canIngestFeedback, assertRole } from "@/lib/permissions";
import { getWorkspaceFeedbackPaginated, buildDateRange } from "@/lib/workspace";
import { FeedbackFilterSchema, SingleFeedbackCreateSchema } from "@/lib/validation";
import { createFeedbackWithClassification } from "@/lib/feedback-ops";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    assertRole(session.user, "VIEWER");

    const url = new URL(request.url);
    const parsed = FeedbackFilterSchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { q, channel, sentiment, status, themeId, dateFrom, dateTo, page, pageSize } = parsed.data;
    const { dateFrom: df, dateTo: dt } = buildDateRange(dateFrom, dateTo);

    const result = await getWorkspaceFeedbackPaginated(session.user.workspaceId, {
      q,
      channel,
      sentiment,
      status,
      themeId,
      dateFrom: df,
      dateTo: dt,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canIngestFeedback(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = SingleFeedbackCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const existingThemes = await db.theme.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, slug: true },
    });

    // ACID: Atomic create + classify + link themes
    const feedback = await createFeedbackWithClassification(
      {
        content: parsed.data.content,
        channel: parsed.data.channel,
        sourceRef: parsed.data.sourceRef,
        customerLabel: parsed.data.customerLabel,
        workspaceId: session.user.workspaceId,
      },
      existingThemes,
    );

    const withLinks = await db.feedback.findUnique({
      where: { id: feedback.id },
      include: { themeLinks: { include: { theme: true } } },
    });

    return NextResponse.json(withLinks, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
