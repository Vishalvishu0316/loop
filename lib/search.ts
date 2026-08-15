import { db } from "@/lib/db";
import { semanticSearch as aiSemanticSearch } from "@/lib/ai";

type SearchResult = {
  id: string;
  channel: string;
  excerpt: string;
  score: number;
  createdAt: string;
};

export async function searchKnowledgeBase(
  workspaceId: string,
  query: string,
  themeId?: string,
  limit = 5,
): Promise<SearchResult[]> {
  try {
    if (!query.trim()) {
      const recent = await db.feedback.findMany({
        where: { workspaceId, ...(themeId ? { themeLinks: { some: { themeId } } } : {}) },
        take: limit,
        orderBy: { createdAt: "desc" },
      });
      return recent.map((f) => ({
        id: f.id,
        channel: f.channel,
        excerpt: f.content,
        score: 1,
        createdAt: f.createdAt.toISOString(),
      }));
    }

    const semResults = await aiSemanticSearch(workspaceId, query, limit, themeId);
    return semResults.map((r) => ({
      id: r.id,
      channel: r.channel,
      excerpt: r.content,
      score: r.score,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [
      {
        id: "demo-feedback",
        channel: "demo",
        excerpt:
          "Search fallback is active because the database is not connected yet. Seed the project to search real feedback.",
        score: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
