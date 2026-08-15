import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canViewData, canGenerateReports } from "@/lib/permissions";
import { GenerateReportSchema } from "@/lib/validation";
import { generateVocReport } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const reports = await db.report.findMany({
      where: { workspaceId: session.user.workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        generatedBy: { select: { id: true, name: true, email: true } },
        theme: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(reports);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canGenerateReports(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 8 VOC report generations per minute per user
    const rl = rateLimit(`reports:${session.user.id}`, { limit: 8, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment before generating another report." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = GenerateReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { periodLabel, periodStart, periodEnd, themeId } = parsed.data;
    const { workspaceId } = session.user;

    const feedbackWhere = {
      workspaceId,
      createdAt: { gte: periodStart, lte: periodEnd },
      ...(themeId ? { themeLinks: { some: { themeId } } } : {}),
    };

    const [periodFeedback, priorFeedback] = await Promise.all([
      db.feedback.findMany({
        where: feedbackWhere,
        include: { themeLinks: { include: { theme: true } } },
      }),
      (() => {
        const ms = periodEnd.getTime() - periodStart.getTime();
        const priorStart = new Date(periodStart.getTime() - ms);
        return db.feedback.findMany({
          where: {
            workspaceId,
            createdAt: { gte: priorStart, lt: periodStart },
            ...(themeId ? { themeLinks: { some: { themeId } } } : {}),
          },
          include: { themeLinks: { include: { theme: true } } },
        });
      })(),
    ]);

    const sentiment = {
      total: periodFeedback.length,
      pos: periodFeedback.filter((f) => f.sentiment === "POS").length,
      neu: periodFeedback.filter((f) => f.sentiment === "NEU").length,
      neg: periodFeedback.filter((f) => f.sentiment === "NEG").length,
    };

    const themeCounts = new Map<string, { name: string; color: string; count: number }>();
    periodFeedback.forEach((f) => {
      f.themeLinks.forEach((tl) => {
        const t = tl.theme;
        const existing = themeCounts.get(t.id) ?? { name: t.name, color: t.color, count: 0 };
        existing.count++;
        themeCounts.set(t.id, existing);
      });
    });

    const priorThemeCounts = new Map<string, number>();
    priorFeedback.forEach((f) => {
      f.themeLinks.forEach((tl) => {
        priorThemeCounts.set(tl.themeId, (priorThemeCounts.get(tl.themeId) ?? 0) + 1);
      });
    });

    const topThemes = Array.from(themeCounts.entries())
      .map(([id, data]) => {
        const priorCount = priorThemeCounts.get(id) ?? 0;
        const trendDelta = priorCount > 0
          ? ((data.count - priorCount) / priorCount) * 100
          : data.count > 0 ? 100 : 0;
        return { ...data, trendDelta };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const channels = Array.from(new Set(periodFeedback.map((f) => f.channel)));

    const verbatimQuotes = periodFeedback
      .filter((f) => f.content.length > 20)
      .sort((a, b) => {
        const score = (s: typeof a) => (s.sentiment === "NEG" ? -1 : s.sentiment === "POS" ? 1 : 0);
        return Math.abs(score(b)) - Math.abs(score(a));
      })
      .slice(0, 5)
      .map((f) => ({
        content: f.content,
        channel: f.channel,
        sentiment: f.sentiment ?? "NEU",
      }));

    const title = `VOC Report · ${periodLabel}`;
    const { summary, markdown } = await generateVocReport({
      title,
      periodLabel,
      periodStart,
      periodEnd,
      topThemes,
      sentiment,
      verbatimQuotes,
      channels,
    });

    const report = await db.report.create({
      data: {
        title,
        periodLabel,
        periodStart,
        periodEnd,
        summary,
        markdown,
        contentJson: {
          topThemes,
          sentiment,
          channels,
          quoteCount: verbatimQuotes.length,
        },
        workspaceId,
        generatedById: session.user.id,
        themeId,
      },
    });

    const fresh = await db.report.findUnique({
      where: { id: report.id },
      include: {
        generatedBy: { select: { id: true, name: true } },
        theme: true,
      },
    });

    return NextResponse.json(fresh, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
