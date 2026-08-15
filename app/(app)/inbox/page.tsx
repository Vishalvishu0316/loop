import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { FeedbackTable, type FeedbackRow } from "@/components/feedback-table";
import { getAppSession, requireWorkspaceSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWorkspaceFeedbackPaginated } from "@/lib/workspace";
import { canIngestFeedback, canModifyFeedback, canClassifyFeedback } from "@/lib/permissions";
import { CHANNELS } from "@/lib/types";
import { IngestionModal } from "./ingestion-modal";
import { CsvBulkImporter } from "@/components/csv-bulk-importer";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/login");
  const { workspaceId, user } = session;
  await requireWorkspaceSession();

  const [initial, themesRaw, channelsRaw] = await Promise.all([
    getWorkspaceFeedbackPaginated(workspaceId, { page: 1, pageSize: 25 }),
    db.theme.findMany({
      where: { workspaceId },
      select: { id: true, name: true, slug: true, color: true },
      orderBy: [{ trendScore: "desc" }, { name: "asc" }],
    }),
    db.feedback.findMany({
      where: { workspaceId },
      select: { channel: true },
      distinct: ["channel"],
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialItems: FeedbackRow[] = initial.items.map((f: any) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    themeLinks: f.themeLinks.map((tl: any) => ({
      ...tl,
      theme: tl.theme,
    })),
  }));

  const canIngest = canIngestFeedback(user);
  const canModify = canModifyFeedback(user);
  const canClassify = canClassifyFeedback(user);
  const channels = channelsRaw.map((c) => c.channel);

  return (
    <>
      <PageHeader
        breadcrumb="Feedback"
        title="Feedback Inbox"
        description="Search, filter, and triage every piece of customer feedback. New items are auto-classified with sentiment, themes, and a feature-area tag."
        actions={
          canIngest ? (
            <div className="flex items-center gap-2">
              <CsvBulkImporter />
              <IngestionModal />
            </div>
          ) : undefined
        }
      />

      <SectionCard
        title="All feedback"
        description={`${initial.total.toLocaleString()} items · Paginated, searchable, filterable. Filters are applied server-side.`}
      >
        <FeedbackTable
          initialItems={initialItems}
          initialTotal={initial.total}
          initialPage={initial.page}
          initialPageSize={initial.pageSize}
          canModify={canModify}
          canClassify={canClassify}
          channels={[...new Set([...CHANNELS, ...channels])]}
          themes={themesRaw}
        />
      </SectionCard>
    </>
  );
}
