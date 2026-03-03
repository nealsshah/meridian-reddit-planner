const SPAM_PHRASES = [
  "buy now",
  "limited time",
  "use my code",
  "discount code",
  "affiliate",
  "promo code",
  "click here",
  "exclusive offer",
  "act now",
  "free trial",
];

export function checkForSpam(text: string): string[] {
  const lower = text.toLowerCase();
  return SPAM_PHRASES.filter((phrase) => lower.includes(phrase));
}
