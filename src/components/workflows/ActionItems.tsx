"use client";

import { useState } from "react";
import type { SocialPost, PrPitch, EmailItem as EmailItemType, ReviewTemplate } from "@/lib/plans/actionValidators";

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-foreground/5 hover:bg-foreground/10 text-muted"
      }`}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "bg-[#0077b5]/10 text-[#0077b5]",
  x: "bg-foreground/5 text-foreground",
  instagram: "bg-[#e4405f]/10 text-[#e4405f]",
  tiktok: "bg-foreground/5 text-foreground",
};

const PLATFORM_COMPOSE_URLS: Record<string, (text: string) => string> = {
  linkedin: (text) =>
    `https://www.linkedin.com/shareArticle?mini=true&summary=${encodeURIComponent(text)}`,
  x: (text) =>
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
};

// ── Social Post ──

export function SocialPostItem({ post }: { post: SocialPost }) {
  const color = PLATFORM_COLORS[post.platform] || "bg-foreground/5 text-muted";
  const composeUrl = PLATFORM_COMPOSE_URLS[post.platform];

  return (
    <div className="border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider ${color}`}>
            {post.platform}
          </span>
          <span className="text-[10px] text-muted">{post.charCount} chars</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyBtn text={post.text} label="Copy" />
          {composeUrl && (
            <a
              href={composeUrl(post.text)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              Open {post.platform === "x" ? "X" : "LinkedIn"}
            </a>
          )}
        </div>
      </div>

      <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Hook</p>
      <p className="text-xs text-accent mb-3">{post.hook}</p>

      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed mb-3 bg-foreground/[0.02] p-3 border border-border/50">
        {post.text}
      </pre>

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {post.hashtags.map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-foreground/5 text-muted">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.notes && (
        <p className="text-[10px] text-muted mt-2 italic">{post.notes}</p>
      )}
    </div>
  );
}

// ── PR Pitch ──

export function PrPitchItem({ pitch }: { pitch: PrPitch }) {
  const mailtoHref = `mailto:?subject=${encodeURIComponent(pitch.subjectLine)}&body=${encodeURIComponent(pitch.body)}`;

  return (
    <div className="border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider bg-success/10 text-success">
          {pitch.outletType}
        </span>
        <div className="flex items-center gap-1.5">
          <CopyBtn text={pitch.body} label="Copy Body" />
          <a
            href={mailtoHref}
            className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Open in Email
          </a>
        </div>
      </div>

      <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Angle</p>
      <p className="text-xs mb-3">{pitch.angle}</p>

      <div className="bg-foreground/[0.02] border border-border/50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Subject:</span>
          <span className="text-sm font-medium">{pitch.subjectLine}</span>
          <CopyBtn text={pitch.subjectLine} label="Copy" />
        </div>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {pitch.body}
        </pre>
      </div>

      <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Send To</p>
      <p className="text-xs mb-2">{pitch.targetDescription}</p>

      {pitch.notes && (
        <p className="text-[10px] text-muted italic">{pitch.notes}</p>
      )}
    </div>
  );
}

// ── Email Sequence Item ──

export function EmailSequenceItem({ email }: { email: EmailItemType }) {
  const mailtoHref = `mailto:?subject=${encodeURIComponent(email.subjectLine)}&body=${encodeURIComponent(email.body)}`;

  return (
    <div className="border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider bg-accent/10 text-accent">
            Email {email.position}
          </span>
          <span className="text-[10px] text-muted">{email.sendDelay}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CopyBtn text={email.body} label="Copy Body" />
          <a
            href={mailtoHref}
            className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Open in Email
          </a>
        </div>
      </div>

      <div className="bg-foreground/[0.02] border border-border/50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Subject:</span>
          <span className="text-sm font-medium">{email.subjectLine}</span>
          <CopyBtn text={email.subjectLine} label="Copy" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Preview:</span>
          <span className="text-xs text-muted">{email.previewText}</span>
        </div>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {email.body}
        </pre>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-muted uppercase tracking-wider">CTA:</span>
        <span className="text-xs font-medium text-accent">{email.ctaText}</span>
      </div>
    </div>
  );
}

// ── Review Template ──

export function ReviewTemplateItem({ template }: { template: ReviewTemplate }) {
  const mailtoHref = `mailto:?subject=${encodeURIComponent(template.subjectLine)}&body=${encodeURIComponent(template.body)}`;

  return (
    <div className="border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] px-2 py-0.5 font-medium uppercase tracking-wider bg-warning/10 text-warning">
          {template.platform}
        </span>
        <div className="flex items-center gap-1.5">
          <CopyBtn text={template.body} label="Copy Body" />
          <a
            href={mailtoHref}
            className="text-[10px] px-2.5 py-1 font-medium tracking-wider uppercase bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
          >
            Open in Email
          </a>
        </div>
      </div>

      <div className="bg-foreground/[0.02] border border-border/50 p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Subject:</span>
          <span className="text-sm font-medium">{template.subjectLine}</span>
          <CopyBtn text={template.subjectLine} label="Copy" />
        </div>
        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {template.body}
        </pre>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-medium text-muted uppercase tracking-wider">Timing:</span>
        <span className="text-xs">{template.timing}</span>
      </div>

      {template.followUp && (
        <details className="mt-2">
          <summary className="text-[10px] font-medium text-muted uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors">
            Follow-up Email
          </summary>
          <div className="mt-2 bg-foreground/[0.02] border border-border/50 p-3">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {template.followUp}
            </pre>
            <div className="mt-2">
              <CopyBtn text={template.followUp} label="Copy Follow-up" />
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
