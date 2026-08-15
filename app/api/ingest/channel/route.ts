import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canIngestFeedback } from "@/lib/permissions";
import { createFeedbackWithClassification } from "@/lib/feedback-ops";
import { apiError } from "@/lib/api-utils";

type ChannelSeed = {
  channel: string;
  items: Array<{ content: string; customerLabel?: string; sourceRef?: string }>;
};

const SEED_CHANNELS: Record<string, () => ChannelSeed> = {
  support: () => ({
    channel: "Support Ticket",
    items: [
      { content: "The export button doesn't do anything when I click it. Tried Chrome and Firefox.", customerLabel: "support@acme.io", sourceRef: "TKT-" + (1200 + Math.floor(Math.random() * 900)) },
      { content: "Search is returning 0 results even when I type exact words I know are in the tickets.", customerLabel: "ops@globex.co", sourceRef: "TKT-" + (1200 + Math.floor(Math.random() * 900)) },
      { content: "Reset password email never arrives. Checked spam folder 3 times.", customerLabel: "jen@initech.com", sourceRef: "TKT-" + (1200 + Math.floor(Math.random() * 900)) },
      { content: "The dashboard chart is showing dates from last month instead of the date range I selected.", customerLabel: "reports@hooli.xyz", sourceRef: "TKT-" + (1200 + Math.floor(Math.random() * 900)) },
      { content: "Invited a teammate but their status is still 'pending' after 48 hours.", customerLabel: "admin@pied.piper", sourceRef: "TKT-" + (1200 + Math.floor(Math.random() * 900)) },
    ],
  }),
  reviews: () => ({
    channel: "App Store Review",
    items: [
      { content: "5 stars - LOOP replaced 3 tools for us. Onboarding was slick and the search is genuinely useful.", customerLabel: "happy_user", sourceRef: "REV-G-" + (2000 + Math.floor(Math.random() * 900)) },
      { content: "3 stars - Good once you learn it but the terminology is confusing at first. What's the difference between a theme and a tag?", customerLabel: "first_time_pm", sourceRef: "REV-G-" + (2000 + Math.floor(Math.random() * 900)) },
      { content: "1 star - Uploaded CSV and it silently failed on half the rows with no error messages.", customerLabel: "frustrated_ops", sourceRef: "REV-G-" + (2000 + Math.floor(Math.random() * 900)) },
      { content: "4 stars - The VOC reports save me hours every Monday. Only wish PDF export had better charts.", customerLabel: "staff_pm", sourceRef: "REV-G-" + (2000 + Math.floor(Math.random() * 900)) },
      { content: "5 stars - Ask LOOP answered a question our entire team was debating. Cited real tickets, not guesses.", customerLabel: "data_driven", sourceRef: "REV-G-" + (2000 + Math.floor(Math.random() * 900)) },
    ],
  }),
  nps: () => ({
    channel: "NPS Survey",
    items: [
      { content: "How likely are you to recommend us? 9/10. The weekly trends caught a spike before support escalated.", customerLabel: "linda@pied.piper" },
      { content: "How likely are you to recommend us? 6/10. The product is solid but mobile experience feels like an afterthought.", customerLabel: "tom@umbrella.corp" },
      { content: "How likely are you to recommend us? 10/10. Onboarding was the smoothest I've ever seen in a B2B tool.", customerLabel: "anna@stark.ind" },
      { content: "How likely are you to recommend us? 3/10. Pricing is opaque and invoices don't have line items.", customerLabel: "finance@wayne.ent" },
      { content: "How likely are you to recommend us? 8/10. Love the reports; wish Slack integration had better threading.", customerLabel: "growth@initech.com" },
    ],
  }),
  sales: () => ({
    channel: "Sales Notes",
    items: [
      { content: "Prospect at Fortune500co said: 'We need a Zendesk integration or we can't buy this year.'", customerLabel: "sales-lead-acme", sourceRef: "DEAL-" + (800 + Math.floor(Math.random() * 200)) },
      { content: "Mid-market prospect asked for SCIM + SSO. Not on the roadmap yet, may lose the deal.", customerLabel: "ae-globex", sourceRef: "DEAL-" + (800 + Math.floor(Math.random() * 200)) },
      { content: "Prospect mentioned 3 competitors by name; they all lose on the Ask LOOP feature per our demo.", customerLabel: "se-piedpiper", sourceRef: "DEAL-" + (800 + Math.floor(Math.random() * 200)) },
      { content: "Customer wants custom white-label reports for their execs. Would pay 2x current price.", customerLabel: "csm-hooli", sourceRef: "DEAL-" + (800 + Math.floor(Math.random() * 200)) },
      { content: "Deal risk: procurement is asking about data residency. Need EU region options.", customerLabel: "sales-ops", sourceRef: "DEAL-" + (800 + Math.floor(Math.random() * 200)) },
    ],
  }),
};

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canIngestFeedback(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const channelKey = url.searchParams.get("channel");
    const seedFn = channelKey ? SEED_CHANNELS[channelKey] : null;

    if (!seedFn) {
      return NextResponse.json(
        {
          error: "Unknown channel",
          availableChannels: Object.keys(SEED_CHANNELS),
        },
        { status: 400 },
      );
    }

    const seed = seedFn();

    const existingThemes = await db.theme.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, slug: true },
    });

    const createdIds: string[] = [];
    const now = Date.now();

    for (let i = 0; i < seed.items.length; i++) {
      const item = seed.items[i];
      const createdAt = new Date(now - (i * 60 * 1000));

      // ACID: Each seed item atomically created with classification + theme links
      const feedback = await createFeedbackWithClassification(
        {
          content: item.content,
          channel: seed.channel,
          sourceRef: item.sourceRef ?? null,
          customerLabel: item.customerLabel ?? null,
          workspaceId: session.user.workspaceId,
          createdAt,
        },
        existingThemes,
      );

      createdIds.push(feedback.id);
    }

    return NextResponse.json({
      ok: true,
      channel: seed.channel,
      count: createdIds.length,
      importedIds: createdIds,
    }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
