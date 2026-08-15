import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { getAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canIngestFeedback } from "@/lib/permissions";
import { DashboardClient } from "./dashboard-client";
import { Tray, Sparkle, Warning, SlidersHorizontal } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  const { workspaceId, user } = session;

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const [totalItems, newThisWeek, sentimentAgg, priorWeek] = await Promise.all([
    db.feedback.count({ where: { workspaceId } }),
    db.feedback.count({ where: { workspaceId, createdAt: { gte: weekAgo } } }),
    db.feedback.groupBy({
      by: ["sentiment"],
      where: { workspaceId, sentiment: { not: null } },
      _count: { sentiment: true },
      _avg: { sentimentScore: true },
    }),
    db.feedback.count({
      where: { workspaceId, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
    }),
  ]);

  const pos = sentimentAgg.find((r) => r.sentiment === "POS")?._count.sentiment ?? 0;
  const neg = sentimentAgg.find((r) => r.sentiment === "NEG")?._count.sentiment ?? 0;
  const neu = sentimentAgg.find((r) => r.sentiment === "NEU")?._count.sentiment ?? 0;
  const classifiedTotal = pos + neg + neu;
  const negPct = classifiedTotal > 0 ? Math.round((neg / classifiedTotal) * 100) : 0;
  const avgScore = sentimentAgg.length > 0
    ? sentimentAgg.reduce((a, r) => a + (r._avg.sentimentScore ?? 0) * (r._count.sentiment ?? 0), 0) / classifiedTotal || 0
    : 0;

  const weekDelta = priorWeek > 0
    ? Math.round(((newThisWeek - priorWeek) / priorWeek) * 100)
    : newThisWeek > 0 ? 100 : 0;

  const canIngest = canIngestFeedback(user);

  const actions = canIngest ? (
    <div className="flex flex-wrap gap-2">
      <a
        href="/inbox"
        className="rounded-xl border border-[var(--outline)] bg-[var(--surface-high)] px-4 py-2 text-sm text-[var(--on-background)] hover:border-[var(--outline)] hover:bg-[var(--surface)]"
      >
        Open inbox
      </a>
      <a
        href="/reports"
        className="rounded-xl btn-primary px-4 py-2 text-sm font-semibold text-[var(--on-background)]  "
      >
        Generate VOC report
      </a>
    </div>
  ) : undefined;

  return (
    <>
      <PageHeader
        breadcrumb="Overview"
        title="Customer feedback, at a glance"
        description="Ranked themes, sentiment motion, and new items from the last seven days. Everything is scoped to your workspace."
        actions={actions}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total feedback"
          value={totalItems.toLocaleString()}
          delta={`${weekDelta >= 0 ? "▲" : "▼"} ${Math.abs(weekDelta)}% vs prior 7d`}
          tone={weekDelta >= 0 ? "good" : "default"}
          hint="All items ever ingested"
          icon={<Tray size={24} />}
        />
        <StatCard
          label="New this week"
          value={newThisWeek.toLocaleString()}
          delta={weekDelta >= 0 ? "+volume this week" : "volume down week-over-week"}
          tone={weekDelta >= 0 ? "warning" : "good"}
          hint="Last 7 days"
          icon={<Sparkle size={24} />}
        />
        <StatCard
          label="Negative share"
          value={`${negPct}%`}
          delta={negPct > 35 ? "Above healthy band (<35%)" : "Within healthy band"}
          tone={negPct > 35 ? "bad" : "good"}
          hint={`${neg} negative / ${classifiedTotal} classified`}
          icon={<Warning size={24} />}
        />
        <StatCard
          label="Avg sentiment score"
          value={avgScore.toFixed(2)}
          delta={avgScore > 0.1 ? "Net positive" : avgScore < -0.1 ? "Net negative" : "Balanced"}
          tone={avgScore > 0.1 ? "good" : avgScore < -0.1 ? "bad" : "default"}
          hint="From -1 (worst) to +1 (best)"
          icon={<SlidersHorizontal size={24} />}
        />
      </div>

      <div className="mt-8 space-y-6">
        <DashboardClient workspaceId={workspaceId} />
      </div>
    </>
  );
}
