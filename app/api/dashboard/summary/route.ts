import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canViewData } from "@/lib/permissions";
import { buildDateRange, workspaceFeedbackWhere } from "@/lib/workspace";
import { apiError } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { workspaceId } = session.user;
    const url = new URL(request.url);
    const { dateFrom, dateTo } = buildDateRange(
      url.searchParams.get("dateFrom") ?? undefined,
      url.searchParams.get("dateTo") ?? undefined,
    );

    const where = workspaceFeedbackWhere(workspaceId, { dateFrom, dateTo });

    const [sentimentBreakdown, topThemesRaw, volumeData] = await Promise.all([
      db.feedback.groupBy({
        by: ["sentiment"],
        where: { ...where, sentiment: { not: null } },
        _count: { sentiment: true },
      }).then((rows) =>
        rows.map((r) => ({ sentiment: r.sentiment, count: r._count.sentiment })),
      ),

      db.$queryRawUnsafe<Array<{ name: string; count: bigint; color: string }>>(`
        SELECT t.name, t.color, COUNT(ft."feedbackId")::int as count
        FROM "Theme" t
        JOIN "FeedbackTheme" ft ON ft."themeId" = t.id
        JOIN "Feedback" f ON f.id = ft."feedbackId"
        WHERE t."workspaceId" = $1
          ${dateFrom ? `AND f."createdAt" >= $2` : ""}
          ${dateTo ? (dateFrom ? `AND f."createdAt" <= $3` : `AND f."createdAt" <= $2`) : ""}
        GROUP BY t.id, t.name, t.color
        ORDER BY count DESC
        LIMIT 10
      `, workspaceId, ...(dateFrom ? [dateFrom] : []), ...(dateTo ? (dateFrom ? [dateTo] : [dateTo]) : [])).catch(() => []),

      buildVolumeDataFast(workspaceId, dateFrom, dateTo),
    ]);

    const topThemes = (topThemesRaw as unknown as Array<{ name: string; count: number | bigint; color: string }>).map((r) => ({
      name: r.name,
      color: r.color,
      count: typeof r.count === "bigint" ? Number(r.count) : r.count,
    }));

    return NextResponse.json({
      volumeOverTime: volumeData,
      sentimentBreakdown,
      topThemes,
    });
  } catch (e) {
    return apiError(e);
  }
}

async function buildVolumeDataFast(workspaceId: string, dateFrom?: Date, dateTo?: Date) {
  const start = dateFrom ?? new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const end = dateTo ?? new Date();

  // Create date buckets upfront
  const dayMap = new Map<string, number>();
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dayMap.set(cursor.toISOString().slice(0, 10), 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  // Fetch all feedback timestamps in the entire window in a SINGLE query
  const items = await db.feedback.findMany({
    where: {
      workspaceId,
      createdAt: { gte: start, lte: end },
    },
    select: { createdAt: true },
  });

  for (const item of items) {
    const key = item.createdAt.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
  }

  return Array.from(dayMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}
