import { z } from "zod";

// ── Social Output ──

export const SocialPostSchema = z.object({
  platform: z.enum(["linkedin", "x", "instagram", "tiktok"]),
  text: z.string(),
  hashtags: z.array(z.string()),
  charCount: z.number(),
  hook: z.string(),
  notes: z.string(),
});

export const SocialOutputSchema = z.object({
  posts: z.array(SocialPostSchema),
});

export type SocialPost = z.infer<typeof SocialPostSchema>;
export type SocialOutput = z.infer<typeof SocialOutputSchema>;

// ── PR Output ──

export const PrPitchSchema = z.object({
  outletType: z.string(),
  angle: z.string(),
  subjectLine: z.string(),
  body: z.string(),
  targetDescription: z.string(),
  notes: z.string(),
});

export const PrOutputSchema = z.object({
  pitches: z.array(PrPitchSchema),
});

export type PrPitch = z.infer<typeof PrPitchSchema>;
export type PrOutput = z.infer<typeof PrOutputSchema>;

// ── Email Output ──

export const EmailItemSchema = z.object({
  position: z.number(),
  subjectLine: z.string(),
  previewText: z.string(),
  body: z.string(),
  ctaText: z.string(),
  sendDelay: z.string(),
});

export const EmailOutputSchema = z.object({
  sequence: z.array(EmailItemSchema),
});

export type EmailItem = z.infer<typeof EmailItemSchema>;
export type EmailOutput = z.infer<typeof EmailOutputSchema>;

// ── Review Output ──

export const ReviewTemplateSchema = z.object({
  platform: z.string(),
  subjectLine: z.string(),
  body: z.string(),
  timing: z.string(),
  followUp: z.string(),
});

export const ReviewOutputSchema = z.object({
  templates: z.array(ReviewTemplateSchema),
});

export type ReviewTemplate = z.infer<typeof ReviewTemplateSchema>;
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
