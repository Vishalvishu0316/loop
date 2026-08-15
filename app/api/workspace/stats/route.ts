import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canViewData } from "@/lib/permissions";
import { apiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await requireWorkspaceSession();
    if (!canViewData(session.user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { workspaceId } = session.user;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalItems, newThisWeek, negCount, posCount, totalCount] = await Promise.all([
      db.feedback.count({ where: { workspaceId } }),
      db.feedback.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
      db.feedback.count({ where: { workspaceId, sentiment: "NEG" } }),
      db.feedback.count({ where: { workspaceId, sentiment: "POS" } }),
      db.feedback.count({ where: { workspaceId, sentiment: { not: null } } }),
    ]);

    const negPct = totalCount > 0 ? Math.round((negCount / totalCount) * 100) : 0;
    const avgSentimentScore = totalCount > 0
      ? (posCount * 1 + negCount * -1) / totalCount
      : 0;

    return NextResponse.json({
      totalItems,
      newThisWeek,
      negativePercent: negPct,
      averageSentimentScore: Number(avgSentimentScore.toFixed(2)),
      newReviews: newThisWeek,
    });
  } catch (e) {
    return apiError(e);
  }
}
