import { NextResponse } from "next/server";
import { generateThreadDraft } from "@/lib/llm/llmClient";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const draft = await generateThreadDraft({
      brandName: body.brandName,
      category: body.category,
      brandVoice: body.brandVoice || "",
      doNotSay: body.doNotSay || "",
      disclosurePolicy: body.disclosurePolicy || "optional",
      promotionStrength: body.promotionStrength || "medium",
      thread: body.thread,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Thread draft generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
