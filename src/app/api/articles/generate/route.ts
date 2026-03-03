import { NextResponse } from "next/server";
import { generateArticle } from "@/lib/llm/llmClient";
import type { Brief } from "@/lib/plans/citationValidators";

export type ArticleGenerateRequest = {
  brandName: string;
  brandDomain?: string;
  category: string;
  brief: Brief;
  citationUrls: string[];
};

export async function POST(req: Request) {
  const provider = process.env.LLM_PROVIDER || "openai";
  if (provider !== "openai") {
    return NextResponse.json(
      { error: "Article generation requires OpenAI with web search. Set LLM_PROVIDER=openai." },
      { status: 400 }
    );
  }

  const body: ArticleGenerateRequest = await req.json();
  const { brandName, brandDomain, category, brief, citationUrls } = body;

  if (!brandName || !category || !brief) {
    return NextResponse.json(
      { error: "brandName, category, and brief are required." },
      { status: 400 }
    );
  }

  try {
    const article = await generateArticle({
      brandName,
      brandDomain,
      category,
      brief,
      citationUrls: citationUrls || [],
    });

    return NextResponse.json(article);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Article generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
