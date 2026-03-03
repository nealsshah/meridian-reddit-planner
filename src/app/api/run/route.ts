import { NextResponse } from "next/server";
import { generateQueryPlan, selectBestThreads, generateThreadDraft } from "@/lib/llm/llmClient";
import type { RedditThread } from "@/app/api/reddit/search/route";
import type { ThreadDraft } from "@/lib/plans/validators";
import type { QueryPlanOutput } from "@/lib/plans/validators";

// Increase timeout for Vercel deployments
export const maxDuration = 120;

export type RunResult = {
  queryPlan: QueryPlanOutput;
  drafts: Array<{
    thread: RedditThread;
    draft: ThreadDraft;
    selectionReason: string;
  }>;
};

async function fetchThreads(subreddit: string, query: string, limit = 10): Promise<RedditThread[]> {
  const sub = subreddit.replace(/^r\//, "");
  const params = new URLSearchParams({
    q: query,
    sort: "relevance",
    t: "month",
    limit: String(limit),
    type: "link",
  });

  let url: string;
  if (sub) {
    params.set("restrict_sr", "1");
    url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?${params}`;
  } else {
    url = `https://www.reddit.com/search.json?${params}`;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MeridianRedditPlanner/1.0 (read-only search tool)" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json?.data?.children ?? []).map((child: { data: Record<string, unknown> }) => {
      const d = child.data;
      const selftext = (d.selftext as string) || "";
      return {
        id: d.id as string,
        title: d.title as string,
        url: `https://www.reddit.com${d.permalink as string}`,
        permalink: d.permalink as string,
        subreddit: d.subreddit as string,
        createdUtc: d.created_utc as number,
        score: d.score as number,
        numComments: d.num_comments as number,
        author: d.author as string,
        selftextSnippet: selftext.slice(0, 300),
      };
    });
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    brandName,
    category,
    goalPrompts,
    targetSubs,
    brandVoice,
    doNotSay,
    disclosurePolicy,
    promotionStrength,
    draftCount = 5,
  } = body;

  try {
    // ── Step 1: Generate query plan ──
    const queryPlan = await generateQueryPlan({
      brandName,
      category,
      goalPrompts,
      targetSubs,
      brandVoice,
      doNotSay,
    });

    // ── Step 2: Fetch threads for all queries in parallel ──
    const fetchJobs: Array<{ subreddit: string; query: string }> = [];
    for (const sq of queryPlan.searchQueries) {
      for (const query of sq.queries) {
        fetchJobs.push({ subreddit: sq.subreddit, query });
      }
    }

    const threadArrays = await Promise.all(
      fetchJobs.map(({ subreddit, query }) => fetchThreads(subreddit, query, 8))
    );

    // Deduplicate by thread ID, keeping the one with highest score
    const threadMap = new Map<string, RedditThread>();
    for (const arr of threadArrays) {
      for (const t of arr) {
        const existing = threadMap.get(t.id);
        if (!existing || t.score > existing.score) {
          threadMap.set(t.id, t);
        }
      }
    }

    const allThreads = Array.from(threadMap.values());

    if (allThreads.length === 0) {
      return NextResponse.json({ error: "No threads found across all queries" }, { status: 404 });
    }

    // ── Step 3: LLM picks the best N threads ──
    const selection = await selectBestThreads({
      brandName,
      category,
      goalPrompts,
      promotionStrength,
      threads: allThreads.map((t) => ({
        id: t.id,
        title: t.title,
        subreddit: t.subreddit,
        selftextSnippet: t.selftextSnippet,
        score: t.score,
        numComments: t.numComments,
        createdUtc: t.createdUtc,
      })),
      count: draftCount,
    });

    // Map selected IDs back to full thread objects
    const selectedThreads = selection.selected
      .map((s) => ({
        thread: threadMap.get(s.id),
        reason: s.reason,
      }))
      .filter((s): s is { thread: RedditThread; reason: string } => !!s.thread);

    // ── Step 4: Generate drafts for selected threads in parallel ──
    const draftResults = await Promise.all(
      selectedThreads.map(async ({ thread, reason }) => {
        const draft = await generateThreadDraft({
          brandName,
          category,
          brandVoice: brandVoice || "",
          doNotSay: doNotSay || "",
          disclosurePolicy: disclosurePolicy || "optional",
          promotionStrength: promotionStrength || "medium",
          thread: {
            subreddit: thread.subreddit,
            url: thread.url,
            title: thread.title,
            selftextSnippet: thread.selftextSnippet,
            score: thread.score,
            numComments: thread.numComments,
            createdUtc: thread.createdUtc,
          },
        });
        return { thread, draft, selectionReason: reason };
      })
    );

    const result: RunResult = { queryPlan, drafts: draftResults };
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Run pipeline error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
