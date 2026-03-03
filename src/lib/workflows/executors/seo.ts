import type { WorkflowTask } from "@/lib/plans/workflowValidators";
import type { Campaign } from "@/lib/store";
import type { ExecutorResult } from "../registry";

export async function executeSeoTask(
  task: WorkflowTask,
  campaign: Campaign,
  baseUrl: string,
): Promise<ExecutorResult> {
  const brief = {
    briefTitle: task.title,
    pageType: task.taskType === "comparison_page" ? "comparison" :
              task.taskType === "faq_page" ? "faq" :
              task.taskType === "data_study" ? "data-study" : "article",
    primaryIntent: task.description,
    targetKeyword: task.inputs?.targetKeyword as string || task.title.toLowerCase(),
    outline: task.inputs?.outline as string[] || [
      "Introduction and context",
      "Key findings and data",
      "Practical recommendations",
      "Conclusion and next steps",
    ],
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
      artifactKey: "generatedArticles",
    };
  }

  const article = await res.json();
  return {
    taskId: task.id,
    success: true,
    message: `Article generated: "${article.title}" (${article.wordCount} words)`,
    artifactKey: "generatedArticles",
    data: article,
  };
}
