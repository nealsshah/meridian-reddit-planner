// ── Social Posts Prompt ──

export function buildSocialPrompt(inputs: {
  brandName: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
}): string {
  const { brandName, category, brandVoice, taskTitle, taskDescription, rationale } = inputs;

  return `You are a social media strategist creating platform-specific posts for a brand.

## Brand Context
- **Brand:** ${brandName}
- **Category:** ${category}
- **Voice:** ${brandVoice || "helpful, practical, no marketing tone"}

## Task
**Title:** ${taskTitle}
**Brief:** ${taskDescription}
**Rationale:** ${rationale}

## Instructions
Generate individual, ready-to-post social media content for each platform. Each post must be completely self-contained — a marketer should be able to copy it and paste it directly into the platform.

Platform-specific rules:
- **LinkedIn**: Professional but conversational. 1300 char max. Use line breaks for readability. Can include a call-to-action.
- **X (Twitter)**: Punchy and concise. 280 char max per tweet. If the idea needs more, write a thread of 2-4 tweets separated by "---". Include 1-3 hashtags.
- **Instagram**: Visual-first caption. 2200 char max. Lead with a hook line. Include 5-10 hashtags at the end.
- **TikTok**: Script-style or caption. 150 char max for the caption. Include 3-5 hashtags. Describe the video concept in notes.

For each post, include:
- The exact text to post (ready to copy-paste)
- A hook (the opening line or concept that grabs attention)
- Relevant hashtags
- The character count of the text
- Any notes about timing, imagery, or context

Return ONLY valid JSON, no markdown fences:
{
  "posts": [
    {
      "platform": "linkedin",
      "text": "the full post text, ready to paste",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "charCount": 450,
      "hook": "the opening line or concept",
      "notes": "best posted on Tuesday morning; pair with product image"
    }
  ]
}`;
}

// ── PR Pitch Prompt ──

export function buildPrPitchPrompt(inputs: {
  brandName: string;
  brandDomain?: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
}): string {
  const { brandName, brandDomain, category, brandVoice, taskTitle, taskDescription, rationale } = inputs;

  return `You are a PR strategist crafting pitch emails for a brand. Use web search to find real, current publication types and journalist beats that cover the ${category} space.

## Brand Context
- **Brand:** ${brandName}
- **Category:** ${category}
- **Domain:** ${brandDomain || "(not provided)"}
- **Voice:** ${brandVoice || "helpful, practical, no marketing tone"}

## Task
**Title:** ${taskTitle}
**Brief:** ${taskDescription}
**Rationale:** ${rationale}

## Instructions
Generate 3-4 individual pitch emails, each targeting a different type of publication or journalist beat. Each pitch must be a complete, ready-to-send email — the marketer just needs to find the right journalist's email address and hit send.

For each pitch:
- **outletType**: The type of publication (e.g. "running industry trade publication", "mainstream fitness media", "tech blog covering sports tech")
- **angle**: The news hook or story angle
- **subjectLine**: A compelling email subject line (under 60 chars)
- **body**: The full email body. Start with a personalized opening placeholder like "[Journalist name]," then the pitch. Keep it under 200 words. End with a clear ask.
- **targetDescription**: Who specifically to send this to (beat, role, example outlet names found via search)
- **notes**: Timing advice, what to attach, follow-up cadence

Return ONLY valid JSON, no markdown fences:
{
  "pitches": [
    {
      "outletType": "industry trade publication",
      "angle": "the news hook",
      "subjectLine": "subject line under 60 chars",
      "body": "full email body ready to send",
      "targetDescription": "who to send this to and example outlets",
      "notes": "timing and follow-up advice"
    }
  ]
}`;
}

// ── Email Nurture Prompt ──

export function buildEmailNurturePrompt(inputs: {
  brandName: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
}): string {
  const { brandName, category, brandVoice, taskTitle, taskDescription, rationale } = inputs;

  return `You are an email marketing strategist creating a nurture sequence for a brand.

## Brand Context
- **Brand:** ${brandName}
- **Category:** ${category}
- **Voice:** ${brandVoice || "helpful, practical, no marketing tone"}

## Task
**Title:** ${taskTitle}
**Brief:** ${taskDescription}
**Rationale:** ${rationale}

## Instructions
Generate a 4-5 email nurture sequence. Each email must be individually complete — a marketer should be able to copy the subject line and body directly into any email service provider (Mailchimp, SendGrid, ConvertKit, etc.).

For each email:
- **position**: Sequence number (1, 2, 3...)
- **subjectLine**: A/B testable subject line (under 60 chars, no spam trigger words)
- **previewText**: The preview/preheader text (under 100 chars)
- **body**: The full email body in plain text with line breaks. Include personalization placeholders like {{first_name}}. Keep each email focused on one idea. 150-250 words.
- **ctaText**: The call-to-action button text
- **sendDelay**: When to send relative to the previous email (e.g. "immediately", "2 days after Email 1", "4 days after Email 2")

Return ONLY valid JSON, no markdown fences:
{
  "sequence": [
    {
      "position": 1,
      "subjectLine": "subject line",
      "previewText": "preview text",
      "body": "full email body with {{first_name}} placeholders",
      "ctaText": "CTA button text",
      "sendDelay": "immediately after signup"
    }
  ]
}`;
}

// ── Review Acquisition Prompt ──

export function buildReviewAcquisitionPrompt(inputs: {
  brandName: string;
  category: string;
  brandVoice?: string;
  taskTitle: string;
  taskDescription: string;
  rationale: string;
}): string {
  const { brandName, category, brandVoice, taskTitle, taskDescription, rationale } = inputs;

  return `You are a customer success strategist creating review request templates for a brand.

## Brand Context
- **Brand:** ${brandName}
- **Category:** ${category}
- **Voice:** ${brandVoice || "helpful, practical, no marketing tone"}

## Task
**Title:** ${taskTitle}
**Brief:** ${taskDescription}
**Rationale:** ${rationale}

## Instructions
Generate 3-4 review request email templates, each targeting a different review platform or context. Each template must be ready to send — the marketer just needs to add the customer's name and the review platform link.

For each template:
- **platform**: The target review platform (e.g. "Google Business", "G2", "Trustpilot", "Amazon", "App Store", "industry-specific")
- **subjectLine**: Email subject line (under 60 chars, personal and non-spammy)
- **body**: Full email body with {{customer_name}} and {{review_link}} placeholders. Keep it warm, brief (under 150 words), and focused on making it easy to leave a review.
- **timing**: When to send this (e.g. "7 days after purchase", "after support ticket resolved", "after renewal")
- **followUp**: A shorter follow-up email body to send if no response after 5 days

Return ONLY valid JSON, no markdown fences:
{
  "templates": [
    {
      "platform": "Google Business",
      "subjectLine": "subject line",
      "body": "full email body with {{customer_name}} and {{review_link}}",
      "timing": "when to send",
      "followUp": "shorter follow-up email body"
    }
  ]
}`;
}
