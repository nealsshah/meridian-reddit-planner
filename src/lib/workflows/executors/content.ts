import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeContentTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const brief = {
    briefTitle: task.title,
    pageType: mapTaskTypeToPageType(task.taskType),
    primaryIntent: task.description,
    targetKeyword: task.inputs?.targetKeyword as string || task.title.toLowerCase(),
    outline: task.inputs?.outline as string[] || buildDefaultOutline(task),
    whatToProve: task.rationale,
    internalLinks: [],
    schemaSuggestions: [],
    competesWith: "",
    safetyNotes: ["Do not copy text verbatim"],
  };

  const citationUrls = campaign.citationResults
    ? Object.values(campaign.citationResults)
        .flatMap((r) => r.citations.map((c) => c.url))
    : [];

  const res = await fetch(`${baseUrl}/api/articles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brandName: campaign.brandName,
      brandDomain: campaign.brandDomain,
      category: campaign.category,
      brief,
      citationUrls,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    return {
      taskId: task.id,
      success: false,
      message: data.error || "Content generation failed",
      artifactKey: "workflowContent",
    };
  }

  const article = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Generated: "${article.title}" (${article.wordCount} words)`,
    artifactKey: "workflowContent",
    data: article,
  };
}

function mapTaskTypeToPageType(taskType: string): string {
  switch (taskType) {
    case "social_repurpose": return "social-posts";
    case "review_acquisition": return "email-template";
    case "pr_pitch": return "pitch-document";
    case "email_nurture": return "email-sequence";
    case "competitor_audit": return "audit-report";
    default: return "article";
  }
}

function buildDefaultOutline(task: WorkflowTask): string[] {
  switch (task.taskType) {
    case "social_repurpose":
      return [
        "Key message and hook",
        "LinkedIn post version (professional tone)",
        "X/Twitter thread version (concise, punchy)",
        "Short-form caption for Instagram/TikTok",
        "Hashtag suggestions per platform",
      ];
    case "review_acquisition":
      return [
        "Subject line options",
        "Email body: personal opening and ask",
        "Review platform links to include",
        "Follow-up email if no response",
        "Timing and cadence recommendations",
      ];
    case "pr_pitch":
      return [
        "Pitch angle and news hook",
        "Subject line options for outreach",
        "Pitch email body",
        "Supporting data points and quotes",
        "Target publication types and journalist profiles",
      ];
    case "email_nurture":
      return [
        "Sequence overview and goal",
        "Email 1: Welcome and value proposition",
        "Email 2: Educational content and social proof",
        "Email 3: Case study or success story",
        "Email 4: Offer or call-to-action",
        "Subject line options for each email",
      ];
    case "competitor_audit":
      return [
        "Competitor landscape overview",
        "Content gap analysis",
        "Keyword and topic opportunities",
        "Citation presence comparison",
        "Actionable recommendations",
      ];
    default:
      return [
        "Introduction and context",
        "Key findings and analysis",
        "Practical recommendations",
        "Conclusion and next steps",
      ];
  }
}
