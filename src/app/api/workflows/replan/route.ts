import { NextResponse } from "next/server";
import { replanWorkflow } from "@/lib/llm/llmClient";
import type { WorkflowPlan, WorkflowTask, Kpi } from "@/lib/plans/workflowValidators";

export const maxDuration = 120;

export type ReplanRequest = {
  brandName: string;
  category: string;
  objective: string;
  workflowPlan: WorkflowPlan;
  workflowTasks: WorkflowTask[];
};

export async function POST(req: Request) {
  const body: ReplanRequest = await req.json();
  const { brandName, category, objective, workflowPlan, workflowTasks } = body;

  if (!brandName || !category || !workflowPlan) {
    return NextResponse.json(
      { error: "brandName, category, and workflowPlan are required." },
      { status: 400 }
    );
  }

  const effectiveObjective = objective ||
    workflowPlan.goal ||
    `Increase visibility for ${brandName} in the ${category} space`;

  const tasks = workflowTasks || workflowPlan.tasks;
  const completedTasks = tasks
    .filter((t) => t.status === "done")
    .map((t) => `- [DONE] ${t.title} (${t.channel}): ${t.description}`)
    .join("\n") || "No tasks completed yet.";

  const pendingTasks = tasks
    .filter((t) => t.status === "todo" || t.status === "in_progress")
    .map((t) => `- [${t.status.toUpperCase()}] ${t.title} (P${t.priority}, ${t.channel})`)
    .join("\n");

  const skippedTasks = tasks
    .filter((t) => t.status === "skipped")
    .map((t) => `- [SKIPPED] ${t.title}`)
    .join("\n");

  const currentPlanSummary = [
    `Goal: ${workflowPlan.goal}`,
    `Audience: ${workflowPlan.audience}`,
    `Channels: ${workflowPlan.channels.join(", ")}`,
    "",
    "Pending tasks:",
    pendingTasks || "(none)",
    "",
    skippedTasks ? `Skipped tasks:\n${skippedTasks}` : "",
  ].join("\n");

  const kpiStatus = workflowPlan.kpis
    .map((kpi: Kpi) =>
      `- ${kpi.metric} (${kpi.channel}): target=${kpi.target}, current=${kpi.currentValue || "not measured"}`
    )
    .join("\n") || "No KPI data yet.";

  try {
    const newPlan = await replanWorkflow({
      brandName,
      category,
      objective: effectiveObjective,
      currentPlan: currentPlanSummary,
      completedTasks,
      kpiStatus,
    });

    return NextResponse.json(newPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Replan failed";
    console.error("Replan error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
