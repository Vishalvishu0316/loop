/**
 * <feedback-ops.ts> — Shared, ACID-compliant feedback operations.
 *
 * Centralises the "classify → persist → link themes → embed" pipeline
 * into transactional functions so every multi-write is atomic.
 */

import { db } from "@/lib/db";
import { classifyFeedback, embedFeedback } from "@/lib/ai";
import type { ClassificationResponse } from "@/lib/validation";
import type { FeedbackStatus } from "@/lib/types";

/* ── Shared Utilities ── */

/** Deterministic slug from a human-readable name. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/* ── Types ── */

export type FeedbackCreateInput = {
  content: string;
  channel: string;
  sourceRef?: string | null;
  customerLabel?: string | null;
  workspaceId: string;
  /** Override status; defaults to "NEW" */
  status?: FeedbackStatus;
  /** Override createdAt for seeded data */
  createdAt?: Date;
};

type ThemeStub = { id: string; name: string; slug: string };

/* ── Core: Link Themes to Feedback (inside a transaction) ── */

/**
 * Find-or-create themes from classification results and link them to a feedback item.
 * Mutates `existingThemes` array in-place when new themes are created.
 *
 * MUST be called inside a Prisma interactive transaction (`db.$transaction`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function linkThemesToFeedback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  feedbackId: string,
  workspaceId: string,
  classifiedThemes: ClassificationResponse["themes"],
  existingThemes: ThemeStub[],
): Promise<void> {
  for (const themeResult of classifiedThemes.slice(0, 3)) {
    let theme: ThemeStub | undefined = existingThemes.find(
      (t) => t.slug === themeResult.slug || t.name === themeResult.name,
    );

    if (!theme) {
      const createdTheme = await tx.theme.create({
        data: {
          name: themeResult.name,
          slug: themeResult.slug,
          color: "#6366f1",
          trendScore: 0,
          workspaceId,
        },
      });
      theme = { id: createdTheme.id, name: createdTheme.name, slug: createdTheme.slug };
      existingThemes.push(theme);
    }

    if (theme) {
      await tx.feedbackTheme.upsert({
        where: { feedbackId_themeId: { feedbackId, themeId: theme.id } },
        create: { feedbackId, themeId: theme.id, confidence: themeResult.confidence },
        update: { confidence: themeResult.confidence },
      });
    }
  }
}

/* ── Public: Create Feedback with Classification (ACID) ── */

/**
 * Atomically creates a feedback record, classifies it, links themes,
 * and generates an embedding — all inside a single Prisma transaction.
 *
 * Returns the created feedback with its theme links populated.
 */
export async function createFeedbackWithClassification(
  input: FeedbackCreateInput,
  existingThemes: ThemeStub[],
) {
  const classification = await classifyFeedback(
    { content: input.content },
    existingThemes,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedback = await db.$transaction(async (tx: any) => {
    const created = await tx.feedback.create({
      data: {
        content: input.content,
        channel: input.channel,
        sourceRef: input.sourceRef ?? null,
        customerLabel: input.customerLabel ?? null,
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        featureArea: classification.featureArea,
        rationale: classification.rationale,
        status: input.status ?? "NEW",
        workspaceId: input.workspaceId,
        ...(input.createdAt
          ? { createdAt: input.createdAt, updatedAt: input.createdAt }
          : {}),
      },
    });

    await linkThemesToFeedback(
      tx,
      created.id,
      input.workspaceId,
      classification.themes,
      existingThemes,
    );

    return created;
  });

  // Embedding generation is idempotent and non-critical — runs outside the transaction
  await embedFeedback(feedback.id, feedback.content);

  return feedback;
}

/* ── Public: Reclassify Existing Feedback (ACID) ── */

/**
 * Atomically reclassifies an existing feedback item:
 * deletes old theme links, updates sentiment/classification fields,
 * and creates new theme links — all inside a single Prisma transaction.
 *
 * Returns the updated feedback with refreshed theme links.
 */
export async function reclassifyExistingFeedback(
  feedbackId: string,
  content: string,
  workspaceId: string,
  existingThemes: ThemeStub[],
) {
  const classification = await classifyFeedback(
    { content },
    existingThemes,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await db.$transaction(async (tx: any) => {
    // Remove old theme links
    await tx.feedbackTheme.deleteMany({ where: { feedbackId } });

    // Update classification fields
    const result = await tx.feedback.update({
      where: { id: feedbackId },
      data: {
        sentiment: classification.sentiment,
        sentimentScore: classification.sentimentScore,
        featureArea: classification.featureArea,
        rationale: classification.rationale,
      },
    });

    // Create new theme links
    await linkThemesToFeedback(
      tx,
      feedbackId,
      workspaceId,
      classification.themes,
      existingThemes,
    );

    return result;
  });

  // Re-embed outside transaction (idempotent)
  await embedFeedback(feedbackId, content);

  // Return fresh data with theme links
  return db.feedback.findUnique({
    where: { id: updated.id },
    include: { themeLinks: { include: { theme: true } } },
  });
}
