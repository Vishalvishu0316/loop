import { GoogleGenAI } from "@google/genai";

import { db } from "@/lib/db";
import { generateFallbackEmbedding, cosineSimilarity } from "@/lib/embeddings";
import { ClassificationResponseSchema, type ClassificationResponse } from "@/lib/validation";
import { slugify } from "@/lib/feedback-ops";
import type { Sentiment } from "@/lib/types";

const ai =
  process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

const defaultModel = process.env.GEMINI_MODEL ?? "gemini-flash-latest";

function stripMarkdownFences(text: string): string {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return t.trim();
}

// slugify is now imported from @/lib/feedback-ops

function heuristicClassify(text: string, existingThemeNames: string[]): ClassificationResponse {
  const normalized = text.toLowerCase();

  let sentiment: Sentiment = "NEU";
  let sentimentScore = 0;

  const posMatches = (normalized.match(/(love|great|excellent|amazing|perfect|fantastic|smooth|easy|helpful|brilliant|best|delight|spot-?on|game changer|snappy|instantly|professional)/g) || []).length;
  const negMatches = (normalized.match(/(bug|broken|slow|frustrat|terrible|awful|worst|hate|issue|confus|unusab|crash|timeout|janky|duplicat|broken|worthless|chaos|cuts off|drowning|wrecked)/g) || []).length;

  if (posMatches > negMatches) {
    sentiment = "POS";
    sentimentScore = Math.min(0.9, 0.3 + posMatches * 0.12);
  } else if (negMatches > posMatches) {
    sentiment = "NEG";
    sentimentScore = Math.max(-0.9, -0.3 - negMatches * 0.12);
  } else {
    sentimentScore = ((posMatches - negMatches) * 0.1);
  }

  const heuristicThemes: Array<{ name: string; slug: string; confidence: number }> = [];

  const keywordMap: Record<string, RegExp[]> = {
    "Search Experience": [/search|filter|find|lookup|retriev/],
    "Onboarding Flow": [/onboard|signup|sign-up|first.?run|welcome|tutorial|invite/],
    "Reporting & Exports": [/report|export|csv|pdf|download|brief|digest|share|stakeholder/],
    "Billing & Pricing": [/bill|pric|invoice|renewal|pay|charge|subscription|tier|downgrad/],
    "Dashboard Performance": [/slow|load|perform|speed|latency|lag|render|crash|memory/],
    "Mobile Experience": [/mobile|iphone|ipad|phone|tablet|pwa|app|offline|responsive|tap/],
    "Integrations": [/integrat|slack|zendesk|webhook|api|connect|third.?party/],
    "Notifications": [/notif|email|alert|bell|digest|ping/],
  };

  for (const [themeName, patterns] of Object.entries(keywordMap)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        heuristicThemes.push({
          name: themeName,
          slug: slugify(themeName),
          confidence: 0.7 + Math.random() * 0.25,
        });
        break;
      }
    }
  }

  if (heuristicThemes.length === 0 && existingThemeNames.length > 0) {
    const name = existingThemeNames[Math.floor(Math.random() * existingThemeNames.length)];
    heuristicThemes.push({
      name,
      slug: slugify(name),
      confidence: 0.55,
    });
  }

  if (heuristicThemes.length === 0) {
    heuristicThemes.push({
      name: "General Feedback",
      slug: "general",
      confidence: 0.6,
    });
  }

  const areas = [...new Set(heuristicThemes.map((t) => t.name.split(" ")[0]))];
  const featureArea = areas[0] ?? "General";

  const headline = text.length > 120 ? text.slice(0, 117) + "..." : text;

  return {
    sentiment,
    sentimentScore: Math.max(-1, Math.min(1, sentimentScore)),
    themes: heuristicThemes.slice(0, 3),
    featureArea,
    rationale: `Heuristic classification: ${posMatches} positive signals, ${negMatches} negative signals. Matched themes: ${heuristicThemes.map((t) => t.name).join(", ") || "none"}. Summary: ${headline}`,
  };
}

export async function classifyFeedback(
  input: { content: string },
  existingThemes: Array<{ id: string; name: string; slug: string }> = [],
): Promise<ClassificationResponse> {
  const existingThemeNames = existingThemes.map((t) => t.name);

  if (!ai) {
    return heuristicClassify(input.content, existingThemeNames);
  }

  const existingThemeList = existingThemeNames.length
    ? `Existing themes (reuse these instead of inventing new ones whenever the feedback fits): ${existingThemeNames.join("; ")}`
    : "No existing themes yet — propose sensible theme names that would group well with future items.";

  const prompt = `You are a customer-feedback classifier. Read the feedback below and return ONLY JSON, no other text and no markdown fences.

Schema requirements:
- sentiment: one of "POS" (positive), "NEU" (neutral/mixed), "NEG" (negative)
- sentimentScore: a number between -1 and 1
- themes: array of objects, each with name (string), slug (kebab-case of name), confidence (0..1). Reuse existing themes when possible. Up to 3.
- featureArea: one short noun phrase (e.g. "Search", "Onboarding", "Billing")
- rationale: one line explaining your classification

${existingThemeList}

FEEDBACK:
${input.content}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: defaultModel,
        contents: prompt,
        config: {
          temperature: attempt * 0.1,
          responseMimeType: "application/json",
        },
      });

      const rawText = response.text || "";
      const jsonText = stripMarkdownFences(rawText);
      const parsed = JSON.parse(jsonText);

      const valid = ClassificationResponseSchema.safeParse(parsed);
      if (valid.success) {
        return valid.data;
      }
    } catch {
      // retry
    }
  }

  return heuristicClassify(input.content, existingThemeNames);
}

export async function embedFeedback(feedbackId: string, content: string): Promise<void> {
  const vector = generateFallbackEmbedding(content);

  await db.embedding.upsert({
    where: { feedbackId },
    create: {
      id: `emb_${feedbackId}`,
      feedbackId,
      vector,
      createdAt: new Date(),
    },
    update: {
      vector,
    },
  });
}

export async function semanticSearch(
  workspaceId: string,
  query: string,
  limit = 8,
  themeId?: string,
): Promise<Array<{ id: string; content: string; channel: string; score: number; createdAt: Date }>> {
  const queryVector = generateFallbackEmbedding(query);

  const candidates = await db.feedback.findMany({
    where: {
      workspaceId,
      ...(themeId ? { themeLinks: { some: { themeId } } } : {}),
    },
    select: {
      id: true,
      content: true,
      channel: true,
      createdAt: true,
      embedding: { select: { feedbackId: true } },
    },
    take: 200,
    orderBy: { createdAt: "desc" },
  });

  const scored = candidates
    .map((fb: { id: string; content: string; channel: string; createdAt: Date }) => {
      const fbVec = generateFallbackEmbedding(fb.content);
      const sim = cosineSimilarity(queryVector, fbVec);
      const keywordBoost = rankTextKeywords(fb.content, query);
      return {
        id: fb.id,
        content: fb.content,
        channel: fb.channel,
        score: sim * 0.7 + keywordBoost * 0.3,
        createdAt: fb.createdAt,
      };
    })
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

const SEARCH_STOP_WORDS = new Set([
  "summarize", "summary", "explain", "what", "where", "when", "which", "who", "why", "how",
  "tell", "show", "give", "feedback", "about", "please", "with", "from", "that", "this",
  "these", "those", "have", "been", "they", "them", "some", "many", "much", "very", "also",
  "does", "doing", "would", "could", "should", "customers", "users", "saying", "people",
]);

function rankTextKeywords(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const rawTokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const meaningfulTokens = rawTokens.filter((t) => t.length >= 3 && !SEARCH_STOP_WORDS.has(t));
  const tokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens.filter((t) => t.length >= 3);
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    const stem = token.endsWith("ing") && token.length > 5
      ? token.slice(0, -3)
      : token.endsWith("s") && token.length > 4
        ? token.slice(0, -1)
        : token;

    if (haystack.includes(token) || (stem.length >= 3 && haystack.includes(stem))) {
      score += 1;
    }
  }
  return Math.min(1, score / Math.max(1, tokens.length));
}

export async function answerLoopQuestion(
  question: string,
  context: Array<{ id: string; content: string; channel: string }>,
): Promise<{ answer: string; citedIds: string[] }> {
  const citedIds = context.map((c) => c.id);

  if (context.length === 0) {
    return {
      answer:
        "I couldn't find any relevant feedback to answer that question. Try rephrasing or broadening your query.",
      citedIds: [],
    };
  }

  const fallbackAnswer = buildFallbackAnswer(question, context);

  if (!ai) {
    return { answer: fallbackAnswer, citedIds };
  }

  const formattedContext = context
    .map((c, i) => `[REF${i + 1}] (${c.channel}) ${c.content}`)
    .join("\n\n");

  const prompt = `You are LOOP, a customer-feedback analyst. Answer the user's question ONLY using the numbered context items below.

GROUNDING RULES:
- If the answer is not present in the context, say so explicitly and say what information is missing.
- Never invent numbers, trends, or feedback items not present in the context.
- Cite the reference numbers as [REF1], [REF2], etc. inside your answer.
- Keep the answer concise (max 6 sentences) but specific.
- End with a short "Summary:" bullet that could go into a status report.

CONTEXT:
${formattedContext}

USER QUESTION:
${question}`;

  try {
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: prompt,
      config: {
        temperature: 0,
      }
    });

    const text = response.text?.trim() || "";

    if (text.length > 0) {
      return { answer: text, citedIds };
    }
  } catch {
    // fall through
  }

  return { answer: fallbackAnswer, citedIds };
}

function buildFallbackAnswer(
  question: string,
  context: Array<{ id: string; content: string; channel: string }>,
): string {
  const topQuotes = context.slice(0, 3).map((c, i) => `> "${c.content.slice(0, 180)}${c.content.length > 180 ? "..." : ""}" — ${c.channel}`).join("\n\n");
  return `Based on ${context.length} relevant feedback items, here is what customers are saying about "${question}":\n\n${topQuotes}\n\nSummary: ${context.length} items reference this topic. Review the citations above for exact wording.`;
}

export async function generateVocReport(input: {
  title: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  topThemes: Array<{ name: string; count: number; trendDelta: number }>;
  sentiment: { pos: number; neu: number; neg: number; total: number };
  verbatimQuotes: Array<{ content: string; channel: string; sentiment: string }>;
  channels: string[];
}) {
  const { title, periodLabel, topThemes, sentiment, verbatimQuotes, channels, periodStart, periodEnd } = input;

  const negPct = sentiment.total > 0 ? Math.round((sentiment.neg / sentiment.total) * 100) : 0;
  const posPct = sentiment.total > 0 ? Math.round((sentiment.pos / sentiment.total) * 100) : 0;
  const neuPct = sentiment.total > 0 ? Math.round((sentiment.neu / sentiment.total) * 100) : 0;
  const netSentimentScore = posPct - negPct; // NSS (+100 to -100)

  const primaryTheme = topThemes[0]?.name ?? "General Feedback";
  const fastestGrowing =
    topThemes.length > 0
      ? [...topThemes].sort((a, b) => Number(b.trendDelta || 0) - Number(a.trendDelta || 0))[0]
      : null;

  const fallbackSummary =
    sentiment.total > 0
      ? `Across ${sentiment.total.toLocaleString()} customer touchpoints during ${periodLabel}, sentiment stands at Net ${netSentimentScore >= 0 ? "+" + netSentimentScore : netSentimentScore}% (${posPct}% positive vs ${negPct}% negative). The dominant feedback driver is ${primaryTheme} with ${topThemes[0]?.count ?? 0} mentions${fastestGrowing && Number(fastestGrowing.trendDelta || 0) > 15 ? `, while ${fastestGrowing.name} showed the sharpest acceleration (+${Number(fastestGrowing.trendDelta || 0).toFixed(0)}%)` : ""}.`
      : `No feedback data recorded for ${periodLabel}.`;

  const fallbackMarkdown = `# ${title}

> **Executive Digest** · Period: ${periodLabel} (${periodStart.toLocaleDateString()} – ${periodEnd.toLocaleDateString()})  
> Ingested **${sentiment.total.toLocaleString()} items** across **${channels.length} channels** (${channels.join(", ") || "All Sources"}).

---

## 1. Executive Summary

${fallbackSummary}

---

## 2. Key Performance Indicators

| Metric | Value | Benchmark / Trajectory |
| :--- | :--- | :--- |
| **Total Feedback Volume** | **${sentiment.total.toLocaleString()}** items | Aggregated across active channels |
| **Positive Share** | **${posPct}%** (${sentiment.pos} items) | Satisfied customer experiences & feature love |
| **Negative Share** | **${negPct}%** (${sentiment.neg} items) | Friction points, bugs, and missing workflows |
| **Net Sentiment Score (NSS)** | **${netSentimentScore >= 0 ? "+" + netSentimentScore + "%" : netSentimentScore + "%"}** | ${netSentimentScore > 30 ? "🟢 Strong Health" : netSentimentScore >= 0 ? "🟡 Moderate / Balanced" : "🔴 Urgent Action Required"} |
| **Primary Driver** | **${primaryTheme}** | ${topThemes[0]?.count ?? 0} mentions (${sentiment.total > 0 ? Math.round(((topThemes[0]?.count ?? 0) / sentiment.total) * 100) : 0}% of total volume) |

---

## 3. Top Themes & Trend Velocity

${topThemes.length === 0 ? "_No themes recorded for this period._" : ""}
${topThemes
  .map((t, i) => {
    const delta = Number(t.trendDelta || 0);
    const count = t.count ?? 0;
    const trendIcon = delta > 10 ? "📈" : delta < -10 ? "📉" : "➡️";
    const trendText = delta >= 0 ? `+${delta.toFixed(0)}%` : `${delta.toFixed(0)}%`;
    const share = sentiment.total > 0 ? Math.round((count / sentiment.total) * 100) : 0;
    return `### ${i + 1}. ${t.name}
- **Volume:** ${count} items (${share}% share of feedback)
- **Trend Velocity:** ${trendIcon} **${trendText}** vs prior baseline
- **Impact Assessment:** ${count > 10 ? "High frequency cluster requiring prioritized visibility." : "Emerging theme to monitor in subsequent cycles."}`;
  })
  .join("\n\n")}

---

## 4. Notable Voice-of-Customer Verbatims

${verbatimQuotes.length === 0 ? "_No verbatim quotes available for this period._" : ""}
${verbatimQuotes
  .map(
    (q, i) =>
      `> **[${q.sentiment === "POS" ? "Positive" : q.sentiment === "NEG" ? "Negative" : "Neutral"}]** *"${q.content}"*  
> — *Source:* **${q.channel}**\n`,
  )
  .join("\n")}

---

## 5. Strategic Action Matrix

### 🚀 Product & Engineering Priorities
1. **Address Top Friction in ${primaryTheme}:** Investigate root causes driving ticket volume and schedule immediate remediation in the upcoming sprint.
2. **Review High-Velocity Outliers:** ${fastestGrowing && Number(fastestGrowing.trendDelta || 0) > 15 ? `Allocate engineering bandwidth to investigate ${fastestGrowing.name} (${Number(fastestGrowing.trendDelta || 0).toFixed(0)}% surge).` : "Maintain existing feature parity and performance budgets."}

### 🎨 UX & Workflow Improvements
3. **Streamline Primary User Journeys:** Revisit friction points highlighted in user comments to eliminate confusing UI steps and mobile discrepancies.

### 💬 Customer Success & Support Enablement
4. **Deploy Contextual Resolution Playbooks:** Equip support teams with canned context for recurring questions regarding ${primaryTheme}.
${negPct > 35 ? `5. **Customer Retention Outreach:** Initiate targeted outreach to accounts affected by negative feedback clusters before quarterly renewals.` : "5. **Leverage Promoter Wins:** Package positive feedback quotes into marketing case studies and team morale wins."}
`;

  if (!ai) {
    return { summary: fallbackSummary, markdown: fallbackMarkdown };
  }

  const themesText = topThemes
    .map((t, i) => {
      const delta = Number(t.trendDelta || 0);
      const count = t.count ?? 0;
      return `${i + 1}. ${t.name} (${count} items, ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% trend delta)`;
    })
    .join("\n");

  const quotesText = verbatimQuotes
    .slice(0, 6)
    .map((q) => `- [${q.sentiment}] (${q.channel}) "${q.content}"`)
    .join("\n");

  const prompt = `You are LOOP's Chief Feedback Intelligence Officer. Generate a comprehensive, executive-ready Voice-of-Customer (VOC) Report for leadership and product managers.

DATA PROVIDED:
- REPORT TITLE: ${title}
- PERIOD: ${periodLabel} (${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()})
- TOTAL ITEMS: ${sentiment.total} (Positive: ${sentiment.pos} (${posPct}%), Neutral: ${sentiment.neu} (${neuPct}%), Negative: ${sentiment.neg} (${negPct}%), Net Sentiment Score: ${netSentimentScore >= 0 ? "+" + netSentimentScore : netSentimentScore}%)
- CHANNELS INGESTED: ${channels.join(", ") || "All Channels"}
- RANKED THEMES:
${themesText}
- SAMPLE VERBATIM QUOTES:
${quotesText}

REPORT REQUIREMENTS:
Format in clear, high-impact Markdown:
1. Executive Summary: 2-3 powerful sentences summarizing net sentiment, core drivers, and key risk/opportunity areas.
2. Key Performance Indicators: A clean markdown table with Total Volume, Positive/Negative breakdown, Net Sentiment Score, and Primary Driver.
3. Top Themes & Trend Velocity: Deep dive into the top themes with volume counts, trend velocity, and impact.
4. Voice-of-Customer Verbatims: Highlight the most critical verbatim quotes with source attribution.
5. Strategic Action Matrix: Clear categorized sections for (a) Product & Engineering Priorities, (b) UX & Usability Fixes, (c) Customer Support / Success Action items.

Keep it strictly grounded in the real data provided. Do not hallucinate numbers.`;

  try {
    const response = await ai.models.generateContent({
      model: defaultModel,
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const markdown = response.text?.trim() || "";

    if (markdown.length > 250) {
      const summaryMatch = markdown
        .split(/\n\n/)
        .find((p) => p.length > 80 && !p.startsWith("#") && !p.startsWith(">")) || fallbackSummary;

      return {
        summary: summaryMatch.slice(0, 320),
        markdown: `# ${title}\n\n` + markdown,
      };
    }
  } catch {
    // fall through
  }

  return { summary: fallbackSummary, markdown: fallbackMarkdown };
}
