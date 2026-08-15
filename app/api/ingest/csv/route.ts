import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "@/lib/auth";
import { canIngestFeedback } from "@/lib/permissions";
import { CHANNELS } from "@/lib/types";
import { rateLimit } from "@/lib/rate-limit";
import { createFeedbackWithClassification } from "@/lib/feedback-ops";
import { apiError } from "@/lib/api-utils";

/* ── CSV Parsing ── */

function parseCSV(text: string): Array<Record<string, string | undefined>> {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headerLine = lines[0];
  const headers = splitCSVLine(headerLine).map((h) => h.trim().toLowerCase());

  const contentIdx = headers.findIndex((h) => h === "content" || h === "body" || h === "feedback" || h === "text");
  const channelIdx = headers.findIndex((h) => h === "channel" || h === "source");
  const customerIdx = headers.findIndex((h) => h === "customer" || h === "customerlabel" || h === "customer_label" || h === "email" || h === "author");
  const refIdx = headers.findIndex((h) => h === "ref" || h === "sourceref" || h === "source_ref" || h === "ticket" || h === "id");

  if (contentIdx === -1) {
    throw new Error("CSV must contain a 'content' column");
  }

  const rows: Array<Record<string, string | undefined>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length === 0) continue;

    const content = cols[contentIdx]?.trim() ?? "";
    if (!content) continue;

    const channel = channelIdx >= 0 ? (cols[channelIdx]?.trim() || "") : "";
    const customerLabel = customerIdx >= 0 ? cols[customerIdx]?.trim() : undefined;
    const sourceRef = refIdx >= 0 ? cols[refIdx]?.trim() : undefined;

    rows.push({ content, channel, customerLabel, sourceRef });
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function normalizeChannel(raw: string): string {
  const r = raw.trim().toLowerCase();
  if (!r) return "Manual Entry";
  const match = CHANNELS.find((c) => c.toLowerCase() === r);
  if (match) return match;
  const fuzzy = CHANNELS.find((c) => c.toLowerCase().includes(r.slice(0, 5)));
  return fuzzy ?? "Manual Entry";
}

/* ── API Handler ── */

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    if (!canIngestFeedback(session.user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 10 CSV uploads per minute per user
    const rl = rateLimit(`csv-ingest:${session.user.id}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a moment." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }

    const formData = await request.formData().catch(() => null);
    let csvText = "";

    if (formData) {
      const file = formData.get("file");
      if (file instanceof Blob) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
        }
        csvText = await file.text();
      } else if (typeof file === "string") {
        csvText = file;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      csvText = typeof body.csv === "string" ? body.csv : "";
    }

    if (!csvText.trim()) {
      return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
    }

    let rows: Array<Record<string, string | undefined>> = [];
    try {
      rows = parseCSV(csvText);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed to parse CSV" },
        { status: 400 },
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "CSV contains over 5,000 rows. Please upload in smaller batches." },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ imported: 0, failed: 0, failures: [] });
    }

    const existingThemes = await db.theme.findMany({
      where: { workspaceId: session.user.workspaceId },
      select: { id: true, name: true, slug: true },
    });

    const imported: string[] = [];
    const failures: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.content) {
        failures.push({ row: i + 2, error: "Missing content" });
        continue;
      }

      const channel = normalizeChannel(row.channel || "");
      try {
        // ACID: Each row is atomically created with its classification + theme links
        const feedback = await createFeedbackWithClassification(
          {
            content: row.content,
            channel,
            sourceRef: row.sourceRef || null,
            customerLabel: row.customerLabel || null,
            workspaceId: session.user.workspaceId,
          },
          existingThemes,
        );

        imported.push(feedback.id);
      } catch (e) {
        failures.push({
          row: i + 2,
          error: e instanceof Error ? e.message : "Import failed",
        });
      }
    }

    return NextResponse.json({
      imported: imported.length,
      failed: failures.length,
      failures,
      importedIds: imported,
    });
  } catch (e) {
    return apiError(e);
  }
}
