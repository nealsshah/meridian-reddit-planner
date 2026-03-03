import { z } from "zod";

export const TASK_TYPES = [
  "reddit_engagement",
  "citation_gap_analysis",
  "pillar_article",
  "comparison_page",
  "faq_page",
  "data_study",
  "social_repurpose",
  "review_acquisition",
  "pr_pitch",
  "email_nurture",
  "competitor_audit",
] as const;

export const CHANNELS = [
  "reddit",
  "seo_content",
  "llm_visibility",
  "social",
  "pr",
  "reviews",
  "email",
] as const;

export const TASK_STATUSES = ["todo", "in_progress", "done", "skipped"] as const;

export const WorkflowTaskSchema = z.object({
  id: z.string(),
  taskType: z.enum(TASK_TYPES),
  channel: z.enum(CHANNELS),
  title: z.string(),
  description: z.string(),
  priority: z.number().min(1).max(100),
  effort: z.enum(["low", "medium", "high"]),
  expectedImpact: z.enum(["low", "medium", "high"]),
  artifactType: z.string(),
  rationale: z.string(),
  status: z.enum(TASK_STATUSES).default("todo"),
  dueInDays: z.number().optional(),
  inputs: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowTask = z.infer<typeof WorkflowTaskSchema>;

export const KpiSchema = z.object({
  metric: z.string(),
  channel: z.enum(CHANNELS),
  baseline: z.string().optional(),
  target: z.string(),
  windowDays: z.number(),
  lastCheck: z.string().optional(),
  currentValue: z.string().optional(),
});

export type Kpi = z.infer<typeof KpiSchema>;

export const WorkflowPlanSchema = z.object({
  goal: z.string(),
  audience: z.string(),
  channels: z.array(z.enum(CHANNELS)),
  timeline: z.object({
    quickWins: z.string(),
    shortTerm: z.string(),
    longTerm: z.string(),
  }),
  tasks: z.array(WorkflowTaskSchema),
  kpis: z.array(KpiSchema),
  summary: z.string(),
});

export type WorkflowPlan = z.infer<typeof WorkflowPlanSchema>;
