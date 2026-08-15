import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getAppSession } from "@/lib/auth";
import { AskClient } from "./ask-client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  const { workspaceId } = session;

  const initialInsights = await db.insight.findMany({
    where: { workspaceId, type: "ANSWER" },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { theme: { select: { name: true, color: true } } },
  }).catch(() => []);

  const themes = await db.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true, color: true },
    orderBy: { trendScore: "desc" },
    take: 20,
  }).catch(() => []);

  return (
    <>
      <PageHeader
        breadcrumb="AI"
        title="Ask LOOP"
        description="Ask questions in plain English. LOOP retrieves the most relevant feedback first, then answers only from what customers actually said — never from its imagination."
      />
      <AskClient
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initialInsights={initialInsights.map((i: any) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        }))}
        themes={themes}
      />
    </>
  );
}
