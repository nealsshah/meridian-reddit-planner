import { NextResponse } from "next/server";
import { executeTask } from "@/lib/workflows/registry";
import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";

export const maxDuration = 120;

export type TaskExecuteRequest = {
  task: WorkflowTask;
  campaign: Campaign;
};

export async function POST(req: Request) {
  const body: TaskExecuteRequest = await req.json();
  const { task, campaign } = body;

  if (!task || !campaign) {
    return NextResponse.json(
      { error: "task and campaign are required." },
      { status: 400 }
    );
  }

  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    const result = await executeTask(task, campaign, baseUrl);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Task execution failed";
    console.error("Task execution error:", message);
    return NextResponse.json(
      { taskId: task.id, success: false, message, artifactKey: "" },
      { status: 500 }
    );
  }
}
