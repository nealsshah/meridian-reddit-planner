import { NextResponse } from "next/server";
import { generateWorkflowPlan } from "@/lib/llm/llmClient";

export const maxDuration = 120;

export type WorkflowGenerateRequest = {
  brandName: string;
  category: string;
  objective: string;
  goalPrompts: string;
  brandDomain?: string;
  competitors?: string;
  brandVoice?: string;
};

export async function POST(req: Request) {
  const body: WorkflowGenerateRequest = await req.json();
  const { brandName, category, objective, goalPrompts } = body;

  if (!brandName || !category || !goalPrompts) {
    return NextResponse.json(
      { error: "brandName, category, and goalPrompts are required." },
      { status: 400 }
    );
  }

  const effectiveObjective = objective ||
    `Increase online visibility for ${brandName} in the ${category} space for the following queries: ${goalPrompts}`;

  try {
    const plan = await generateWorkflowPlan({
      ...body,
      objective: effectiveObjective,
    });

    return NextResponse.json(plan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Workflow generation failed";
    console.error("Workflow generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
