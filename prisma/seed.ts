import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";
import { generateFallbackEmbedding } from "../lib/embeddings";

const prisma = new PrismaClient();

type ThemeSeed = {
  name: string;
  slug: string;
  description: string;
  color: string;
  trendScore: number;
};

const THEMES: ThemeSeed[] = [
  { name: "Search Experience", slug: "search", description: "Search quality, filtering, and retrieval speed.", color: "#6366f1", trendScore: 42 },
  { name: "Onboarding Flow", slug: "onboarding", description: "Signup, activation, and first-run experience.", color: "#8b5cf6", trendScore: 37 },
  { name: "Reporting & Exports", slug: "reporting", description: "Dashboard exports, VOC reports, shareable links.", color: "#0ea5e9", trendScore: 33 },
  { name: "Billing & Pricing", slug: "billing", description: "Subscription pricing, invoices, payment issues.", color: "#10b981", trendScore: 28 },
  { name: "Dashboard Performance", slug: "performance", description: "Page load, chart rendering, slow interactions.", color: "#f59e0b", trendScore: 25 },
  { name: "Mobile Experience", slug: "mobile", description: "Mobile web, responsive issues, native app gaps.", color: "#ef4444", trendScore: 21 },
  { name: "Integrations", slug: "integrations", description: "Third-party integrations, API access, webhooks.", color: "#14b8a6", trendScore: 19 },
  { name: "Notifications", slug: "notifications", description: "Email alerts, in-app notifications, frequency.", color: "#f97316", trendScore: 15 },
];

type FeedbackSeed = {
  content: string;
  channel: string;
  sourceRef?: string;
  customerLabel?: string;
  sentiment: "POS" | "NEU" | "NEG";
  sentimentScore: number;
  status: "NEW" | "REVIEWED" | "ACTIONED";
  featureArea: string;
  themeSlugs: string[];
  daysAgo: number;
  author?: string;
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function buildFeedback(): FeedbackSeed[] {
  const items: FeedbackSeed[] = [];
  let seed = 1;

  const authors = [
    "sarah@acme.io", "mike@globex.co", "jen@initech.com", "raj@hooli.xyz",
    "linda@pied.piper", "tom@umbrella.corp", "anna@stark.ind", "bob@wayne.ent",
    "support@customer.com", "nps@user-mail.io", "sales@outreach.team", "reviews@appstore.com",
  ];

  const sourceRefs = [
    "TKT-1001", "TKT-1042", "TKT-1109", "REV-8821", "NPS-W42", "CSAT-Q3",
    "SLACK-221", "EMAIL-554", "CHAT-773", "CALL-998", "FORUM-445", "SURV-127",
  ];

  const negativeContents: Array<{ content: string; area: string; themes: string[] }> = [
    { content: "Search is basically unusable when you have more than a thousand tickets — it times out before returning anything.", area: "Search", themes: ["search", "performance"] },
    { content: "I can't find anything using the search box. It only matches exact words, not synonyms or partial matches.", area: "Search", themes: ["search"] },
    { content: "Why does search only look at titles? Half my feedback is in the body and I can't find any of it.", area: "Search", themes: ["search"] },
    { content: "The onboarding flow is confusing. I signed up and then had no idea what to do next. No tutorial, no checklist, nothing.", area: "Onboarding", themes: ["onboarding"] },
    { content: "I invited three team members and none of them got the invite email. Had to resend three times each.", area: "Onboarding", themes: ["onboarding", "notifications"] },
    { content: "First week here and I still don't understand the difference between themes and tags. The setup wizard didn't explain it.", area: "Onboarding", themes: ["onboarding"] },
    { content: "CSV upload is broken. I followed the template exactly and 40 of 50 rows failed with no explanation of why.", area: "Data Ingestion", themes: ["reporting"] },
    { content: "The weekly report takes 10 minutes to generate. I can't forward something to leadership that takes this long to open.", area: "Reporting", themes: ["reporting", "performance"] },
    { content: "PDF export is worthless — the charts don't render and all the tables get cut off. Completely unusable for exec meetings.", area: "Reporting", themes: ["reporting"] },
    { content: "Pricing jumped 40% at renewal with zero warning. No email, no in-app banner, just a bigger invoice.", area: "Billing", themes: ["billing"] },
    { content: "We can't downgrade without emailing support. Why can't this be self-serve? It's 2025.", area: "Billing", themes: ["billing"] },
    { content: "Invoices don't show line items. Our finance team is going crazy trying to reconcile charges.", area: "Billing", themes: ["billing"] },
    { content: "The dashboard takes 12 seconds to load on a good day. On Monday mornings it's closer to 30 seconds.", area: "Performance", themes: ["performance"] },
    { content: "Charts re-render constantly when filters are applied and the whole page jumps around.", area: "Performance", themes: ["performance"] },
    { content: "Anything with more than 3 months of data crashes the tab entirely. Chrome just runs out of memory.", area: "Performance", themes: ["performance", "dashboard"] },
    { content: "The mobile site is a joke. You can't even see the sidebar on an iPhone without horizontal scrolling.", area: "Mobile", themes: ["mobile"] },
    { content: "Tried to triage feedback on my iPad and the status buttons don't respond to taps. Have to zoom in each time.", area: "Mobile", themes: ["mobile"] },
    { content: "No native mobile app. The PWA is janky and doesn't work offline at all.", area: "Mobile", themes: ["mobile"] },
    { content: "Still no Slack integration after 9 months on the roadmap. We're drowning in Slack threads and can't import them.", area: "Integrations", themes: ["integrations"] },
    { content: "The Zendesk integration duplicates tickets. Every reply creates a new feedback item instead of threading.", area: "Integrations", themes: ["integrations"] },
    { content: "Webhooks fire once and then stop. No retry mechanism, no dead-letter queue, nothing.", area: "Integrations", themes: ["integrations"] },
    { content: "I get 40 emails a day from this tool. There's no way to bulk-adjust notification settings.", area: "Notifications", themes: ["notifications"] },
    { content: "Notification about what? I clicked the bell and there are 150 things from 3 months ago with no way to mark all read.", area: "Notifications", themes: ["notifications"] },
    { content: "Digest emails show zero items but say 'your weekly update is ready'. What's the point?", area: "Notifications", themes: ["notifications", "reporting"] },
    { content: "Filters don't stick. I set a date range, navigate away, come back, and everything is reset.", area: "UX", themes: ["dashboard"] },
    { content: "Status change doesn't save half the time. I click 'Reviewed' and it reverts to 'New' on refresh.", area: "UX", themes: ["onboarding"] },
    { content: "Ask LOOP gives completely wrong answers. I asked about search complaints and it quoted feedback about billing.", area: "AI", themes: ["search"] },
    { content: "CSV template is wrong on the download page — columns don't match what the importer actually expects.", area: "Data Ingestion", themes: ["reporting", "onboarding"] },
    { content: "We have 20 themes and the dashboard only shows 5. Where are the rest? No pagination, no scroll, nothing.", area: "Dashboard", themes: ["dashboard", "performance"] },
    { content: "Can't archive old feedback. The list grows forever and there's no bulk delete or bulk status change.", area: "Inbox", themes: ["dashboard"] },
  ];

  const neutralContents: Array<{ content: string; area: string; themes: string[] }> = [
    { content: "Search results are OK but would be better if it prioritized recent items over older ones.", area: "Search", themes: ["search"] },
    { content: "The onboarding checklist exists but could be more specific about next steps.", area: "Onboarding", themes: ["onboarding"] },
    { content: "Exports work fine for internal use, but I wouldn't send them to a client directly.", area: "Reporting", themes: ["reporting"] },
    { content: "Billing is straightforward once you know where to look, but the invoice page is buried.", area: "Billing", themes: ["billing"] },
    { content: "Dashboard speed is acceptable during off-peak hours. Monday mornings are slower but manageable.", area: "Performance", themes: ["performance"] },
    { content: "Mobile works for reading data but I wouldn't try to do heavy triage on it.", area: "Mobile", themes: ["mobile"] },
    { content: "Slack integration does what it says on the tin, though threading could be better.", area: "Integrations", themes: ["integrations"] },
    { content: "Notifications are frequent but I can see why — nothing was missed while I was out.", area: "Notifications", themes: ["notifications"] },
    { content: "Theme clustering is decent. Most items land in the right place, but 10-15% need manual correction.", area: "AI", themes: ["search"] },
    { content: "Ask LOOP answers simple questions well. Complex multi-part questions get confused.", area: "AI", themes: ["search"] },
    { content: "Date range filter is fine, though preset options like 'Last 90 days' would save time.", area: "Dashboard", themes: ["dashboard"] },
    { content: "CSV upload template is documented, just took a couple tries to match all the columns.", area: "Data Ingestion", themes: ["reporting"] },
    { content: "Role settings make sense. Viewer can't break anything, Analyst can work without Admin power.", area: "Settings", themes: ["onboarding"] },
    { content: "Customer support replied within a day. Not instant, but not terrible.", area: "Support", themes: ["integrations"] },
    { content: "VOC reports are useful if you edit them before sending. About 70% of the narrative I can use as-is.", area: "Reporting", themes: ["reporting"] },
    { content: "Trends view shows the right direction, but the spike detection is a bit over-sensitive.", area: "Themes", themes: ["search", "dashboard"] },
  ];

  const positiveContents: Array<{ content: string; area: string; themes: string[] }> = [
    { content: "LOOP's search replaced our old Google Sheet workflow entirely. Finding related feedback in seconds is a game changer.", area: "Search", themes: ["search"] },
    { content: "Best search experience I've used in a feedback tool. Fuzzy matching actually works and results are relevant.", area: "Search", themes: ["search"] },
    { content: "Onboarding took 10 minutes and we were importing our first tickets by lunch. Great first-run experience.", area: "Onboarding", themes: ["onboarding"] },
    { content: "The invite flow is the smoothest I've seen — three teammates onboarded themselves without any help from me.", area: "Onboarding", themes: ["onboarding"] },
    { content: "Weekly VOC reports take me 2 minutes instead of 2 hours. Leadership actually reads them now because they look professional.", area: "Reporting", themes: ["reporting"] },
    { content: "Shareable report links are brilliant. I send the same URL every Monday and execs don't need accounts.", area: "Reporting", themes: ["reporting"] },
    { content: "Billing portal is clean. Usage metrics match what I expect and upgrading tiers took two clicks.", area: "Billing", themes: ["billing"] },
    { content: "Transparent pricing with no surprise overage fees. I budgeted correctly this quarter for the first time.", area: "Billing", themes: ["billing"] },
    { content: "Dashboard loads instantly even with six months of data. Never seen a BI-style tool this snappy.", area: "Performance", themes: ["performance"] },
    { content: "The charts don't lie — page speed scores from Lighthouse back up how fast this feels day to day.", area: "Performance", themes: ["performance"] },
    { content: "Mobile PWA is indistinguishable from a native app. I triage feedback from the train every morning.", area: "Mobile", themes: ["mobile"] },
    { content: "Responsive layout is actually responsive. Everything rearranges correctly on every device size we tested.", area: "Mobile", themes: ["mobile"] },
    { content: "Zendesk integration was the fastest setup ever. Clicked connect, selected views, done. Zero config chaos.", area: "Integrations", themes: ["integrations"] },
    { content: "Webhooks saved us from building our own polling. Every new piece of data hits our data lake in real time.", area: "Integrations", themes: ["integrations"] },
    { content: "The daily digest is the first email I open. It tells me exactly what spiked overnight without any noise.", area: "Notifications", themes: ["notifications", "reporting"] },
    { content: "Notification settings are granular. I told LOOP to only ping me when sentiment on a theme drops below -0.3 and it works perfectly.", area: "Notifications", themes: ["notifications"] },
    { content: "Theme clustering is scarily good. It grouped 400 items into 12 themes in under a minute and most were spot-on.", area: "AI", themes: ["search"] },
    { content: "Ask LOOP answered 11 of 12 stakeholder questions during our product review. Cited actual feedback, not guesses.", area: "AI", themes: ["search"] },
    { content: "Sentiment detection is accurate. It caught sarcasm and tone better than I expected from an automated tool.", area: "AI", themes: ["dashboard"] },
    { content: "Status workflow (New → Reviewed → Actioned) is simple enough the whole team adopted it in a day.", area: "Inbox", themes: ["dashboard", "onboarding"] },
    { content: "Bulk CSV import saved us from 3 days of data entry. 800 rows processed in under a minute with accurate error reporting.", area: "Data Ingestion", themes: ["reporting"] },
    { content: "RBAC is perfect. Analysts can work without accidentally deleting data, Viewers can share externally.", area: "Settings", themes: ["onboarding"] },
    { content: "Trends caught a spike in onboarding complaints 3 days before we would have noticed it manually.", area: "Themes", themes: ["search", "onboarding"] },
    { content: "LOOP paid for itself in the first month when we found and fixed a search bug affecting 300+ customers.", area: "General", themes: ["search", "performance"] },
    { content: "Finally a tool where the dashboard actually shows you what's going on. No chart junk, no vanity metrics.", area: "Dashboard", themes: ["dashboard", "reporting"] },
  ];

  negativeContents.forEach((item) => {
    seed++;
    items.push({
      content: item.content,
      channel: pick(["Support Ticket", "App Store Review", "NPS Survey", "CSAT Survey", "Live Chat", "Social Media"], seed),
      sourceRef: pick(sourceRefs, seed + 1) + (seed % 50),
      customerLabel: pick(authors, seed + 2),
      sentiment: "NEG",
      sentimentScore: -0.4 - ((seed % 60) / 100),
      status: pick(["NEW", "REVIEWED", "NEW", "NEW", "REVIEWED", "ACTIONED"] as const, seed + 3),
      featureArea: item.area,
      themeSlugs: item.themes,
      daysAgo: seed % 60,
      author: pick(authors, seed + 4),
    });
  });

  neutralContents.forEach((item) => {
    seed++;
    items.push({
      content: item.content,
      channel: pick(["NPS Survey", "CSAT Survey", "Sales Notes", "Community Forum", "Manual Entry"], seed),
      sourceRef: pick(sourceRefs, seed + 1) + (seed % 50),
      customerLabel: pick(authors, seed + 2),
      sentiment: "NEU",
      sentimentScore: (seed % 30) / 100 - 0.15,
      status: pick(["REVIEWED", "NEW", "REVIEWED", "ACTIONED"] as const, seed + 3),
      featureArea: item.area,
      themeSlugs: item.themes,
      daysAgo: (seed * 2) % 55,
      author: pick(authors, seed + 4),
    });
  });

  positiveContents.forEach((item) => {
    seed++;
    items.push({
      content: item.content,
      channel: pick(["App Store Review", "NPS Survey", "Sales Notes", "Live Chat", "Community Forum"], seed),
      sourceRef: pick(sourceRefs, seed + 1) + (seed % 50),
      customerLabel: pick(authors, seed + 2),
      sentiment: "POS",
      sentimentScore: 0.3 + ((seed % 70) / 100),
      status: pick(["REVIEWED", "ACTIONED", "REVIEWED", "NEW"] as const, seed + 3),
      featureArea: item.area,
      themeSlugs: item.themes,
      daysAgo: (seed * 3) % 50,
      author: pick(authors, seed + 4),
    });
  });

  while (items.length < 130) {
    seed++;
    const templates = [
      { set: negativeContents, sentiment: "NEG" as const, baseScore: -0.5 },
      { set: neutralContents, sentiment: "NEU" as const, baseScore: 0 },
      { set: positiveContents, sentiment: "POS" as const, baseScore: 0.5 },
    ];
    const template = pick(templates, seed);
    const contentItem = pick(template.set, seed + 1);
    items.push({
      content: contentItem.content,
      channel: pick(["Support Ticket", "App Store Review", "NPS Survey", "CSAT Survey", "Sales Notes", "Live Chat", "Social Media", "Community Forum"] as const, seed),
      sourceRef: pick(sourceRefs, seed + 2) + "-" + (seed % 100),
      customerLabel: pick(authors, seed + 3),
      sentiment: template.sentiment,
      sentimentScore: template.baseScore + ((seed % 40) / 100) * (template.sentiment === "NEG" ? -1 : 1),
      status: pick(["NEW", "REVIEWED", "ACTIONED", "NEW", "REVIEWED"] as const, seed + 4),
      featureArea: contentItem.area,
      themeSlugs: contentItem.themes,
      daysAgo: seed % 45,
      author: pick(authors, seed + 5),
    });
  }

  return items;
}

async function main() {
  console.log("Seeding LOOP...");

  console.log("Clearing existing data...");
  await prisma.report.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.feedbackTheme.deleteMany();
  await prisma.embedding.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  console.log("Creating workspace and users...");
  const workspace = await prisma.workspace.create({
    data: { name: "AI Customer Feedback" },
  });

  const adminEmail = process.env.LOOP_DEMO_EMAIL ?? "alex@acme.io";
  const adminPassword = process.env.LOOP_DEMO_PASSWORD ?? "Password123!";

  const [adminUser, analystUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Alex Rivera",
        email: adminEmail,
        passwordHash: hashPassword(adminPassword),
        role: "ADMIN",
        workspaceId: workspace.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Sam Chen",
        email: "sam@acme.io",
        passwordHash: hashPassword("Password123!"),
        role: "ANALYST",
        workspaceId: workspace.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Jordan Taylor",
        email: "jordan@acme.io",
        passwordHash: hashPassword("Password123!"),
        role: "VIEWER",
        workspaceId: workspace.id,
      },
    }),
  ]);

  console.log("Creating themes...");
  const themes = await Promise.all(
    THEMES.map((t) =>
      prisma.theme.create({
        data: {
          name: t.name,
          slug: t.slug,
          description: t.description,
          color: t.color,
          trendScore: t.trendScore,
          workspaceId: workspace.id,
        },
      }),
    ),
  );
  const themeBySlug = new Map(themes.map((t) => [t.slug, t]));

  console.log("Creating feedback items...");
  const feedbackSeeds = buildFeedback();

  const createdFeedback = [];
  const embeddingInserts: Array<{ feedbackId: string; vector: number[] }> = [];
  const themeLinks: Array<{ feedbackId: string; themeId: string; confidence: number }> = [];

  for (let i = 0; i < feedbackSeeds.length; i++) {
    const seed = feedbackSeeds[i];
    const daysAgo = seed.daysAgo;
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - (i % 720) * 60 * 1000);

    const fb = await prisma.feedback.create({
      data: {
        content: seed.content,
        channel: seed.channel,
        sourceRef: seed.sourceRef,
        customerLabel: seed.customerLabel,
        sentiment: seed.sentiment,
        sentimentScore: seed.sentimentScore,
        status: seed.status,
        featureArea: seed.featureArea,
        rationale: `Auto-classified as ${seed.sentiment} with score ${seed.sentimentScore.toFixed(2)} during seed.`,
        workspaceId: workspace.id,
        createdAt,
        updatedAt: createdAt,
      },
    });
    createdFeedback.push(fb);

    const vector = generateFallbackEmbedding(seed.content);
    embeddingInserts.push({ feedbackId: fb.id, vector });

    seed.themeSlugs.forEach((slug, idx) => {
      const theme = themeBySlug.get(slug);
      if (theme) {
        themeLinks.push({
          feedbackId: fb.id,
          themeId: theme.id,
          confidence: 0.98 - idx * 0.15 - (i % 20) * 0.01,
        });
      }
    });
  }

  console.log("Inserting embeddings...");
  for (const emb of embeddingInserts) {
    await prisma.embedding.create({
      data: {
        id: `emb_${emb.feedbackId}`,
        feedbackId: emb.feedbackId,
        vector: emb.vector,
        createdAt: new Date(),
      },
    }).catch(() => {});
  }

  console.log("Creating feedback-theme links...");
  if (themeLinks.length > 0) {
    await prisma.feedbackTheme.createMany({ data: themeLinks });
  }

  console.log("Creating sample VOC report...");
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  await prisma.report.create({
    data: {
      title: "Weekly Voice-of-Customer Brief",
      periodLabel: "Last 7 days",
      periodStart,
      periodEnd,
      summary:
        "Search performance remains the strongest negative signal. Onboarding confusion spiked. Reporting and exports continue to show highly positive engagement.",
      markdown: `# Weekly Voice-of-Customer Brief

**Reporting Period:** Last 7 days
**Generated by:** ${adminUser.name}
**Workspace:** ${workspace.name}

## Executive Summary

Acme SaaS received ${feedbackSeeds.length} total feedback items this period across 8 channels. Search latency and onboarding friction are the clearest negative themes, while VOC reports and Slack-based digest notifications continue to delight users.

## Top Themes This Week

1. **Search Experience** — ${Math.round(themes[0].trendScore)} mentions, trending upward. Search latency under large datasets is the dominant complaint.
2. **Onboarding Flow** — ${Math.round(themes[1].trendScore)} mentions, spiking 22% vs last week following the new pricing page rollout.
3. **Reporting & Exports** — ${Math.round(themes[2].trendScore)} mentions, overwhelmingly positive. Shareable links drove 4x more exec engagement.
4. **Billing & Pricing** — ${Math.round(themes[3].trendScore)} mentions; renewal notification transparency is the main ask.
5. **Dashboard Performance** — ${Math.round(themes[4].trendScore)} mentions, concentrated on Monday mornings.

## Sentiment Snapshot

- **Positive:** ${feedbackSeeds.filter((f) => f.sentiment === "POS").length} items
- **Neutral:** ${feedbackSeeds.filter((f) => f.sentiment === "NEU").length} items
- **Negative:** ${feedbackSeeds.filter((f) => f.sentiment === "NEG").length} items

## Notable Verbatim Quotes

> *"Search is basically unusable when you have more than a thousand tickets — it times out before returning anything."* — Support Ticket, customer sentiment NEG

> *"Weekly VOC reports take me 2 minutes instead of 2 hours. Leadership actually reads them now because they look professional."* — NPS Survey, customer sentiment POS

> *"Ask LOOP answered 11 of 12 stakeholder questions during our product review. Cited actual feedback, not guesses."* — Sales Notes, customer sentiment POS

## Recommended Actions

1. **Prioritize search latency this sprint.** Volume of complaints is up 18% week-over-week and represents the clearest negative signal.
2. **Add onboarding checklist improvements.** Three customers explicitly mentioned being lost after signup; a 3-step tutorial could prevent churn.
3. **Send renewal notifications 14 days before charge.** Billing complaints will spike next month without this fix given renewal timelines.
4. **Investigate Monday-morning dashboard slowdown.** Time-bound cache warming or a read replica should eliminate the 30-second load times.
`,
      contentJson: {
        topThemes: themes.slice(0, 5).map((t) => ({ name: t.name, score: t.trendScore })),
        sentiment: {
          pos: feedbackSeeds.filter((f) => f.sentiment === "POS").length,
          neu: feedbackSeeds.filter((f) => f.sentiment === "NEU").length,
          neg: feedbackSeeds.filter((f) => f.sentiment === "NEG").length,
        },
        channels: Array.from(new Set(feedbackSeeds.map((f) => f.channel))),
      },
      workspaceId: workspace.id,
      generatedById: adminUser.id,
      themeId: themes[2].id,
    },
  });

  console.log("Creating sample insight (Ask LOOP)...");
  await prisma.insight.create({
    data: {
      question: "What should the team prioritize this week based on customer feedback?",
      answer:
        "The clearest priority this week is search latency. Search complaints account for the highest-volume negative theme, with multiple customers noting timeouts on large datasets. As a near-term follow-up, onboarding confusion has spiked 22% week-over-week after the pricing page rollout and deserves a focused fix. Reporting and exports remain a bright spot and do not need immediate engineering attention.",
      summary: "Search latency is the #1 priority, onboarding confusion is a fast-rising #2.",
      type: "ANSWER",
      citedIds: createdFeedback.slice(0, 5).map((f) => f.id),
      workspaceId: workspace.id,
      themeId: themes[0].id,
    },
  });

  console.log("\nSeed complete! Summary:");
  console.log(`  Workspace: ${workspace.name}`);
  console.log(`  Users: 1 ADMIN (${adminUser.email}), 1 ANALYST (${analystUser.email}), 1 VIEWER (${viewerUser.email})`);
  console.log(`  Themes: ${themes.length}`);
  console.log(`  Feedback items: ${createdFeedback.length}`);
  console.log(`  Theme links: ${themeLinks.length}`);
  console.log(`  Reports: 1`);
  console.log(`  Insights: 1`);
  console.log("\nDemo logins (from README.md):");
  console.log(`  ADMIN:   alex@acme.io   / Password123!`);
  console.log(`  ANALYST: sam@acme.io    / Password123!`);
  console.log(`  VIEWER:  jordan@acme.io / Password123!`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
