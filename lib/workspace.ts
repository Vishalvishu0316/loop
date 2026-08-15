import { db } from "@/lib/db";
import type { FeedbackStatus, Sentiment } from "@/lib/types";

type FeedbackListFilters = {
  q?: string;
  channel?: string;
  sentiment?: Sentiment;
  status?: FeedbackStatus;
  themeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function workspaceFeedbackWhere(
  workspaceId: string,
  filters: FeedbackListFilters = {},
): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { workspaceId };

  if (filters.q) {
    where.OR = [
      { content: { contains: filters.q, mode: "insensitive" } },
      { customerLabel: { contains: filters.q, mode: "insensitive" } },
      { sourceRef: { contains: filters.q, mode: "insensitive" } },
      { featureArea: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.channel) {
    where.channel = filters.channel;
  }

  if (filters.sentiment) {
    where.sentiment = filters.sentiment;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.themeId) {
    where.themeLinks = { some: { themeId: filters.themeId } };
  }

  if (filters.dateFrom || filters.dateTo) {
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) dateRange.gte = filters.dateFrom;
    if (filters.dateTo) dateRange.lte = filters.dateTo;
    where.createdAt = dateRange;
  }

  return where;
}

export async function getWorkspaceFeedbackPaginated(
  workspaceId: string,
  filters: FeedbackListFilters & { page?: number; pageSize?: number } = {},
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;
  const skip = (page - 1) * pageSize;

  const where = workspaceFeedbackWhere(workspaceId, filters);

  const [items, total] = await Promise.all([
    db.feedback.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        themeLinks: {
          include: { theme: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    db.feedback.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getWorkspaceThemes(workspaceId: string) {
  return db.theme.findMany({
    where: { workspaceId },
    orderBy: [{ trendScore: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: { feedbackLinks: true },
      },
    },
  });
}

export async function getWorkspaceReports(workspaceId: string) {
  return db.report.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: {
      generatedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getWorkspaceMembers(workspaceId: string) {
  return db.user.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function ensureUserInWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { workspaceId: true },
  });
  return user?.workspaceId === workspaceId;
}

export function buildDateRange(
  dateFrom?: string | Date,
  dateTo?: string | Date,
): { dateFrom?: Date; dateTo?: Date } {
  return {
    dateFrom: dateFrom
      ? typeof dateFrom === "string"
        ? new Date(dateFrom)
        : dateFrom
      : undefined,
    dateTo: dateTo
      ? typeof dateTo === "string"
        ? new Date(dateTo)
        : dateTo
      : undefined,
  };
}
