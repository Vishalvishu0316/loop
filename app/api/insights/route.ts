import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canViewData } from "@/lib/permissions";
import { AskLoopSchema } from "@/lib/validation";
import { semanticSearch, answerLoopQuestion } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

    const insights = await db.insight.findMany({
      where: { workspaceId: session.user.workspaceId },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { theme: { select: { id: true, name: true, color: true } } },
    });

    return NextResponse.json(insights);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Rate limit: 20 Ask LOOP queries per minute per user
    const rl = rateLimit(`insights:${session.user.id}`, { limit: 20, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment before asking another question." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = AskLoopSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid question" },
        { status: 400 },
      );
    }

    const { workspaceId } = session.user;
    const { question, themeId } = parsed.data;

    const context = await semanticSearch(workspaceId, question, 8, themeId);
    const groundedContext = context.map((c) => ({
      id: c.id,
      content: c.content,
      channel: c.channel,
    }));

    const { answer, citedIds } = await answerLoopQuestion(question, groundedContext);

    const citedFeedback = await db.feedback.findMany({
      where: { id: { in: citedIds } },
      select: {
        id: true,
        content: true,
        channel: true,
        sentiment: true,
        createdAt: true,
        themeLinks: { include: { theme: { select: { name: true, color: true } } } },
      },
    });

    let summary = null;
    try {
      summary = answer.split("Summary:").pop()?.trim().slice(0, 140) ?? null;
    } catch {}

    const saved = await db.insight.create({
      data: {
        question,
        answer,
        summary,
        type: "ANSWER",
        citedIds,
        workspaceId,
        themeId,
      },
    });

    return NextResponse.json({
      ...saved,
      citedFeedback,
    }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
