import { z } from "zod";

export const CitationSchema = z.object({
  url: z.string(),
  domain: z.string(),
  title: z.string(),
  citationRole: z.string(),
  relevanceToBrand: z.string(),
  notes: z.string().optional().default(""),
});

export type Citation = z.infer<typeof CitationSchema>;

export const BriefSchema = z.object({
  briefTitle: z.string(),
  pageType: z.string(),
  primaryIntent: z.string(),
  targetKeyword: z.string(),
  outline: z.array(z.string()),
  whatToProve: z.string(),
  internalLinks: z.array(z.string()).optional().default([]),
  schemaSuggestions: z.array(z.string()).optional().default([]),
  competesWith: z.string().optional().default(""),
  safetyNotes: z.array(z.string()).optional().default([]),
});

export type Brief = z.infer<typeof BriefSchema>;

export const CitationResultSchema = z.object({
  prompt: z.string(),
  answerSummary: z.string(),
  topPicks: z.array(z.string()).optional().default([]),
  citations: z.array(CitationSchema),
  gaps: z.array(z.string()).optional().default([]),
  briefs: z.array(BriefSchema),
});

export type CitationResult = z.infer<typeof CitationResultSchema>;

export const CitationCaptureResponseSchema = z.object({
  results: z.array(CitationResultSchema),
});

export type CitationCaptureResponse = z.infer<typeof CitationCaptureResponseSchema>;
