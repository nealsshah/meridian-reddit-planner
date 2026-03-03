import { NextResponse } from "next/server";
import { generateSocialPosts } from "@/lib/llm/llmClient";

export const maxDuration = 120;

export type SocialGenerateRequest = {
  brandName: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
};

export async function POST(req: Request) {
  const body: SocialGenerateRequest = await req.json();
  const { brandName, category, taskTitle, taskDescription } = body;

  if (!brandName || !category || !taskTitle || !taskDescription) {
    return NextResponse.json(
      { error: "brandName, category, taskTitle, and taskDescription are required." },
      { status: 400 }
    );
  }

  try {
    const result = await generateSocialPosts(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Social post generation failed";
    console.error("Social generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
