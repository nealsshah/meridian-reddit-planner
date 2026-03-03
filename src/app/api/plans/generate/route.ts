import { NextResponse } from "next/server";
import { generateQueryPlan } from "@/lib/llm/llmClient";

export async function POST(req: Request) {
  const { brandName, category, goalPrompts, targetSubs, brandVoice, doNotSay } =
    await req.json();

  try {
    const plan = await generateQueryPlan({
      brandName,
      category,
      goalPrompts,
      targetSubs,
      brandVoice,
      doNotSay,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Query plan generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
