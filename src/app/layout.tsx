import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const dmDisplay = DM_Serif_Display({
  variable: "--font-dm-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Meridian — Reddit Action Planner",
  description: "Generate actionable Reddit marketing plans with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmDisplay.variable} ${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        <nav className="border-b-2 border-foreground bg-background sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-accent text-lg leading-none select-none">◊</span>
              <span className="font-sans text-sm font-semibold tracking-[0.2em] uppercase">
                Meridian
              </span>
            </Link>
            <Link
              href="/campaigns/new"
              className="border border-foreground text-foreground px-4 py-1.5 text-xs font-medium tracking-widest uppercase hover:bg-foreground hover:text-background transition-all duration-150"
            >
              + New Campaign
            </Link>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
