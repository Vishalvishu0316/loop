import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getAppSession } from "@/lib/auth";
import { TrendsClient } from "./trends-client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  const { workspaceId } = session;

  const themes = await db.theme.findMany({
    where: { workspaceId },
    orderBy: [{ trendScore: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { feedbackLinks: true } },
    },
  });

  return (
    <>
      <PageHeader
        breadcrumb="Themes"
        title="Themes & Trends"
        description="LOOP groups similar feedback into themes and flags what is spiking compared to the prior period. Drill into any theme to see the underlying items."
      />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TrendsClient workspaceId={workspaceId} initialThemes={themes.map((t: any) => ({ ...t, _count: t._count }))} />
    </>
  );
}
