import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Accounts Receivable & Collections Agent",
  description: "ARC Automations' AR collections, dunning, and dispute-handling prototype.",
};

const NAV = [
  { href: "/", label: "Aging" },
  { href: "/disputes", label: "Disputes" },
  { href: "/cash-forecast", label: "Cash forecast" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b" style={{ borderColor: "var(--line)", background: "rgba(247,247,247,0.86)", backdropFilter: "blur(10px)" }}>
          <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-semibold text-sm">ARC Automations</span>
              <span className="mono text-xs" style={{ color: "var(--muted-2)" }}>/ collections</span>
            </div>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="mono text-xs px-3 py-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">{children}</main>
        <footer className="mono text-xs text-center py-8" style={{ color: "var(--muted-2)" }}>
          ARC AUTOMATIONS · AR COLLECTIONS AGENT · PROTOTYPE
        </footer>
      </body>
    </html>
  );
}
