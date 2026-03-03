import { z } from "zod";

export const GeneratedArticleSchema = z.object({
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  wordCount: z.number(),
  sourcesUsed: z.array(z.string()),
  safetyNotes: z.array(z.string()),
});

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;
