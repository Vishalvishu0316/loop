import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChartLineUp, ChatTeardropText, ShieldCheck, Sparkle } from "@phosphor-icons/react/dist/ssr";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-10 selection:bg-[var(--primary-container)] selection:text-[var(--on-background)] overflow-hidden">
      {/* Background ambient gradient signal glows */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[var(--primary)]/10 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[var(--secondary)]/10 blur-[120px]"
        aria-hidden="true"
      />

      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--outline-variant)] bg-[var(--surface)] shadow-2xl md:grid md:grid-cols-[1.1fr_0.9fr]">
        {/* Left Brand Showcase Panel */}
        <section className="relative flex flex-col justify-between overflow-hidden bg-[var(--surface-low)] p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[var(--outline-variant)]">
          {/* Subtle grid pattern background */}
          <div className="absolute inset-0 surface-signal opacity-40 pointer-events-none" />

          <div className="relative z-10">
            <Link href="/" className="inline-block mb-8">
              <Logo size="lg" variant="full" />
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--primary-container)]/30 px-3 py-1 text-xs font-mono text-[var(--primary)] mb-5">
              <Sparkle size={13} weight="fill" />
              <span>Feedback Intelligence</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--on-background)] leading-snug">
              Every customer voice, synthesized into clear strategic signal.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[var(--on-surface-variant)]">
              LOOP connects support tickets, app reviews, survey NPS, and customer emails into one automated clustering pipeline. Stop drowning in raw feedback—lead with evidence.
            </p>

            {/* Feature highlights */}
            <div className="mt-8 space-y-3">
              {[
                { icon: ChartLineUp, title: "Autonomous Theme Clustering", desc: "Groups thousands of requests into high-impact topics in real time." },
                { icon: ChatTeardropText, title: "Grounded AI Q&A", desc: "Answers leadership questions citing only verbatim customer voice." },
                { icon: ShieldCheck, title: "Executive-Ready VOC Reports", desc: "Generates board-ready digests with volume shifts and action matrix." },
              ].map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface)] p-3 hover:border-[var(--primary)]/30 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Icon size={18} weight="duotone" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--on-background)]">{feat.title}</div>
                      <div className="text-[11.5px] text-[var(--on-surface-variant)] leading-tight mt-0.5">{feat.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-[var(--outline-variant)] flex items-center justify-between text-xs text-[var(--on-surface-variant)]">
            <span>© {new Date().getFullYear()} LOOP Inc.</span>
            <div className="flex gap-3">
              <Link href="/" className="hover:text-[var(--on-background)] transition-colors">Home</Link>
              <span>·</span>
              <Link href="/dashboard" className="hover:text-[var(--on-background)] transition-colors">Workspace</Link>
            </div>
          </div>
        </section>

        {/* Right Auth Form Section */}
        <section className="flex flex-col justify-center p-6 sm:p-10 bg-[var(--surface)]">
          {children}
        </section>
      </div>
    </div>
  );
}
