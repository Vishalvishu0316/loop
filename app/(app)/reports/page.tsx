import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getAppSession, requireWorkspaceSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { canGenerateReports } from "@/lib/permissions";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  await requireWorkspaceSession();
  const { workspaceId, user } = session;

  const [reports, themes] = await Promise.all([
    db.report.findMany({
      where: { workspaceId },
      include: {
        generatedBy: { select: { name: true, email: true } },
      },
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    db.theme.findMany({
      where: { workspaceId },
      select: { id: true, name: true, color: true },
      orderBy: { trendScore: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        breadcrumb="AI · Reports"
        title="Voice-of-Customer reports"
        description="Generate a shareable, leadership-ready digest for a chosen period. Reports combine real aggregated counts with AI-written narrative — no hallucinated numbers."
      />
      <ReportsClient
        canGenerate={canGenerateReports(user)}
        themes={themes}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialReports={reports.map((r: any) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          periodStart: r.periodStart.toISOString(),
          periodEnd: r.periodEnd.toISOString(),
        }))}
      />
    </>
  );
}
