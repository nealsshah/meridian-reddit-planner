import { NextResponse } from "next/server";
import { generatePrPitches } from "@/lib/llm/llmClient";

export const maxDuration = 120;

export type PrGenerateRequest = {
  brandName: string;
  brandDomain?: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
};

export async function POST(req: Request) {
  const provider = process.env.LLM_PROVIDER || "openai";
  if (provider !== "openai") {
    return NextResponse.json(
      { error: "PR pitch generation requires OpenAI with web search. Set LLM_PROVIDER=openai." },
      { status: 400 }
    );
  }

  const body: PrGenerateRequest = await req.json();
  const { brandName, category, taskTitle, taskDescription } = body;

  if (!brandName || !category || !taskTitle || !taskDescription) {
    return NextResponse.json(
      { error: "brandName, category, taskTitle, and taskDescription are required." },
      { status: 400 }
    );
  }

  try {
    const result = await generatePrPitches(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "PR pitch generation failed";
    console.error("PR generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
