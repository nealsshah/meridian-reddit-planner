import { NextResponse } from "next/server";
import { generateCitationCapture } from "@/lib/llm/llmClient";
import { ensureSafetyNote, checkUnsafePhrases } from "@/lib/citationSafety";
import type { CitationResult } from "@/lib/plans/citationValidators";

export type CitationCaptureRequest = {
  brandName: string;
  brandDomain?: string;
  category: string;
  prompts: string[];
  competitors?: string[];
};

export type CitationCaptureResult = {
  results: CitationResult[];
  unsafePhraseWarnings?: string[];
};

export async function POST(req: Request) {
  const provider = process.env.LLM_PROVIDER || "openai";
  if (provider !== "openai") {
    return NextResponse.json(
      { error: "Citation capture requires OpenAI with web search. Set LLM_PROVIDER=openai." },
      { status: 400 }
    );
  }

  const body: CitationCaptureRequest = await req.json();
  const { brandName, brandDomain, category, prompts, competitors } = body;

  if (!brandName || !category || !prompts || prompts.length === 0) {
    return NextResponse.json(
      { error: "brandName, category, and at least one prompt are required." },
      { status: 400 }
    );
  }

  const results: CitationResult[] = [];
  const allUnsafePhrases: string[] = [];

  for (const prompt of prompts) {
    const result = await generateCitationCapture({
      brandName,
      brandDomain,
      category,
      competitors,
      prompt,
    });

    result.briefs = ensureSafetyNote(result.briefs);

    const briefTexts = result.briefs
      .map((b) => `${b.briefTitle} ${b.whatToProve} ${b.outline.join(" ")}`)
      .join(" ");
    const unsafe = checkUnsafePhrases(briefTexts);
    if (unsafe.length > 0) {
      allUnsafePhrases.push(...unsafe.map((p) => `[${prompt}] ${p}`));
    }

    results.push(result);
  }

  const response: CitationCaptureResult = { results };
  if (allUnsafePhrases.length > 0) {
    response.unsafePhraseWarnings = allUnsafePhrases;
  }

  return NextResponse.json(response);
}
