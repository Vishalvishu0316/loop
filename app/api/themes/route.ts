import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canViewData, canModifyFeedback } from "@/lib/permissions";
import { CreateThemeSchema } from "@/lib/validation";
import { slugify } from "@/lib/feedback-ops";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(request.url);
    const withTrends = url.searchParams.get("trends") === "true";
    const workspaceId = session.user.workspaceId;

    const themes = await db.theme.findMany({
      where: { workspaceId },
      orderBy: [{ trendScore: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { feedbackLinks: true } },
      },
    });

    if (!withTrends) {
      return NextResponse.json(themes);
    }

    // ── High-Performance Single-Query Aggregation ──
    const now = new Date();
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Build the 14 day buckets upfront (YYYY-MM-DD)
    const dayKeys: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    // Query all feedback-theme links in the 28-day window in ONE query
    const links = await db.feedbackTheme.findMany({
      where: {
        theme: { workspaceId },
        feedback: { createdAt: { gte: prevStart } },
      },
      select: {
        themeId: true,
        feedback: { select: { createdAt: true } },
      },
    });

    // In-memory bucketing per theme
    const themeStats = new Map<
      string,
      {
        currentCount: number;
        prevCount: number;
        dayMap: Map<string, number>;
      }
    >();

    for (const theme of themes) {
      const dayMap = new Map<string, number>();
      for (const dk of dayKeys) dayMap.set(dk, 0);
      themeStats.set(theme.id, { currentCount: 0, prevCount: 0, dayMap });
    }

    const currentStartTime = currentStart.getTime();

    for (const link of links) {
      const stats = themeStats.get(link.themeId);
      if (!stats) continue;

      const createdTime = link.feedback.createdAt.getTime();
      if (createdTime >= currentStartTime) {
        stats.currentCount++;
        const dayKey = link.feedback.createdAt.toISOString().slice(0, 10);
        if (stats.dayMap.has(dayKey)) {
          stats.dayMap.set(dayKey, (stats.dayMap.get(dayKey) ?? 0) + 1);
        }
      } else {
        stats.prevCount++;
      }
    }

    const withTrendData = themes.map((theme) => {
      const stats = themeStats.get(theme.id);
      const currentCount = stats?.currentCount ?? 0;
      const prevCount = stats?.prevCount ?? 0;

      const trendDelta = prevCount > 0
        ? Math.round(((currentCount - prevCount) / prevCount) * 100)
        : currentCount > 0 ? 100 : 0;

      const spiking = trendDelta > 15 && currentCount >= 3;
      const declining = trendDelta < -15 && currentCount >= 2;

      const perDay = dayKeys.map((date) => ({
        date,
        count: stats?.dayMap.get(date) ?? 0,
      }));

      return {
        ...theme,
        currentCount,
        prevCount,
        trendDelta,
        spiking,
        declining,
        perDay,
      };
    });

    return NextResponse.json(withTrendData);
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canModifyFeedback(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const parsed = CreateThemeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid theme data", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name, description, color } = parsed.data;

    const slug = slugify(name);

    const existing = await db.theme.findFirst({
      where: { workspaceId: session.user.workspaceId, slug },
    });
    if (existing) return NextResponse.json({ error: "A theme with this name already exists in your workspace" }, { status: 409 });

    const theme = await db.theme.create({
      data: {
        name,
        slug,
        description: description || null,
        color,
        trendScore: 0,
        workspaceId: session.user.workspaceId,
      },
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
