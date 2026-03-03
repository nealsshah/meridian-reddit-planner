import { z } from "zod";

// ── LLM Call #1: Query Planner ──

const SubredditSchema = z.object({
  name: z.string(),
  why: z.string(),
  riskNotes: z.string(),
  postingStyle: z.enum(["comment-first", "post-ok"]),
  ruleWarnings: z.array(z.string()),
});

const SearchQuerySchema = z.object({
  subreddit: z.string(),
  queries: z.array(z.string()),
  threadArchetypes: z.array(z.string()),
});

const DailyCadenceSchema = z.object({
  maxCommentsPerDay: z.number(),
  maxPostsPerWeek: z.number(),
  rotationStrategy: z.string(),
});

export const QueryPlanOutputSchema = z.object({
  subreddits: z.array(SubredditSchema),
  searchQueries: z.array(SearchQuerySchema),
  dailyCadence: DailyCadenceSchema,
});

export type QueryPlanOutput = z.infer<typeof QueryPlanOutputSchema>;

// ── LLM Call #2: Thread Selector ──

export const ThreadSelectionSchema = z.object({
  selected: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
    })
  ),
});

export type ThreadSelection = z.infer<typeof ThreadSelectionSchema>;

// ── LLM Call #3: Thread-specific Draft ──

export const ThreadDraftSchema = z.object({
  recommendedAction: z.string(),
  whyThisWillWork: z.string(),
  comment: z.string(),
  disclosureLine: z.string(),
  followUps: z.array(z.string()),
  mustAvoid: z.array(z.string()),
  promotionStrength: z.enum(["soft", "medium", "strong"]),
});

export type ThreadDraft = z.infer<typeof ThreadDraftSchema>;
