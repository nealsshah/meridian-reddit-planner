import { NextResponse } from "next/server";

export type RedditThread = {
  id: string;
  title: string;
  url: string;
  permalink: string;
  subreddit: string;
  createdUtc: number;
  score: number;
  numComments: number;
  author: string;
  selftextSnippet: string;
};

// Simple in-memory cache: key -> { data, timestamp }
const cache = new Map<string, { data: RedditThread[]; ts: number }>();
const CACHE_TTL = 60_000; // 60 seconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const subreddit = searchParams.get("subreddit") || "";
  const t = searchParams.get("t") || "month";
  const sort = searchParams.get("sort") || "relevance";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 25);

  if (!q) {
    return NextResponse.json({ error: "q (query) is required" }, { status: 400 });
  }

  const cacheKey = `${subreddit}|${q}|${sort}|${t}|${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const params = new URLSearchParams({
    q,
    sort,
    t,
    limit: String(limit),
    type: "link",
  });

  let url: string;
  if (subreddit) {
    const sub = subreddit.replace(/^r\//, "");
    params.set("restrict_sr", "1");
    url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/search.json?${params}`;
  } else {
    url = `https://www.reddit.com/search.json?${params}`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MeridianRedditPlanner/1.0 (read-only search tool)",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Reddit API error:", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: `Reddit returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const children = json?.data?.children ?? [];

    const threads: RedditThread[] = children.map(
      (child: { data: Record<string, unknown> }) => {
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
      }
    );

    cache.set(cacheKey, { data: threads, ts: Date.now() });

    return NextResponse.json(threads);
  } catch (err) {
    console.error("Reddit fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch from Reddit" },
      { status: 502 }
    );
  }
}
