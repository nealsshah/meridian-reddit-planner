import type { Brief } from "./plans/citationValidators";

const SAFETY_NOTE = "Do not copy text verbatim";

const UNSAFE_PHRASES = [
  "copy this",
  "rewrite their article",
  "steal",
  "verbatim",
  "plagiarize",
  "scrape their content",
  "duplicate their page",
];

export function ensureSafetyNote(briefs: Brief[]): Brief[] {
  return briefs.map((b) => {
    const notes = b.safetyNotes ?? [];
    if (!notes.some((n) => n.toLowerCase().includes("do not copy text verbatim"))) {
      return { ...b, safetyNotes: [...notes, SAFETY_NOTE] };
    }
    return b;
  });
}

export function checkUnsafePhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return UNSAFE_PHRASES.filter((phrase) => lower.includes(phrase));
}
