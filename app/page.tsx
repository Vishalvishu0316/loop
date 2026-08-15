import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Signal3DCanvas } from "@/components/signal-3d-canvas";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--on-background)] selection:bg-[var(--primary-container)] selection:text-[var(--on-background)]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--background)]/85 backdrop-blur-md border-b border-[var(--outline-variant)]">
        <div className="max-w-[1120px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link href="/" aria-label="LOOP Home">
            <Logo size="md" variant="full" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/dashboard" className="btn-primary text-sm px-5 py-2.5 rounded-lg">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-[#0E1116] text-[#E7E9ED] pt-[70px] pb-[40px] relative overflow-hidden">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-xs tracking-widest text-[#E8A33D] uppercase mb-[18px]"
            style={{ animation: "fade-in-up 0.6s ease-out" }}>
            Feedback intelligence
          </div>
          <h1 className="text-[clamp(34px,5vw,54px)] font-semibold leading-[1.12] max-w-[700px] mb-5 tracking-tight"
            style={{ animation: "fade-in-up 0.6s 0.1s ease-out both" }}>
            Every piece of feedback, turned into one clear signal.
          </h1>
          <p className="text-[17px] text-[#9AA3B2] max-w-[520px] leading-relaxed mb-8"
            style={{ animation: "fade-in-up 0.6s 0.2s ease-out both" }}>
            LOOP collects bulk and form feedback, clusters it automatically, visualizes it, and drafts context-aware replies — so nothing gets lost in the noise.
          </p>
          <div className="flex gap-4 mb-10"
            style={{ animation: "fade-in-up 0.6s 0.3s ease-out both" }}>
            <Link href="/dashboard" className="btn-primary text-sm px-5 py-2.5 rounded-lg">
              Get started
            </Link>
            <Link href="#how" className="flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold border border-[#2B313D] text-[#E7E9ED] hover:border-[#E8A33D] hover:text-[#E8A33D] transition-colors bg-transparent">
              See how it works
            </Link>
          </div>

          {/* 3D Signal Visualiser */}
          <div style={{ animation: "fade-in-up 0.8s 0.4s ease-out both" }}>
            <Signal3DCanvas />
          </div>

          <div className="flex gap-10 border-t border-[#232833] pt-6 mt-8 flex-wrap"
            style={{ animation: "fade-in-up 0.6s 0.6s ease-out both" }}>
            <div>
              <div className="font-mono text-[22px] text-[#E7E9ED] tabular-nums">12,480</div>
              <div className="text-[12.5px] text-[#9AA3B2] mt-0.5">responses grouped</div>
            </div>
            <div>
              <div className="font-mono text-[22px] text-[#3F9C8C] tabular-nums">86%</div>
              <div className="text-[12.5px] text-[#9AA3B2] mt-0.5">positive signal</div>
            </div>
            <div>
              <div className="font-mono text-[22px] text-[#E2695A] tabular-nums">3</div>
              <div className="text-[12.5px] text-[#9AA3B2] mt-0.5">urgent clusters</div>
            </div>
            <div>
              <div className="font-mono text-[22px] text-[#E7E9ED] tabular-nums">2.1s</div>
              <div className="text-[12.5px] text-[#9AA3B2] mt-0.5">avg. cluster time</div>
            </div>
          </div>
        </div>
      </header>

      {/* Problem Section */}
      <section id="problem" className="py-[84px]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[var(--primary)] mb-3 font-semibold">
            The problem
          </div>
          <h2 className="text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight mb-4 max-w-[640px]">
            Feedback arrives everywhere. Nobody has time to read all of it.
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-start mt-11">
            <p className="text-[var(--on-surface-variant)] text-[15.5px] leading-relaxed">
              A support ticket here, a survey response there, a spreadsheet of 4,000 rows from last quarter&apos;s
              NPS campaign. Each one is a real signal about what&apos;s working and what isn&apos;t — but scattered
              across channels, with no way to tell a pattern from a one-off complaint, most of it just
              goes unread.
              <br/><br/>
              LOOP treats every channel as one input to the same pipeline, so the question stops being
              &quot;did anyone read this?&quot; and starts being &quot;what is everyone telling us?&quot;
            </p>
            <div className="flex flex-col">
              {[
                ["01", "Bulk CSV / email import"],
                ["02", "Embedded feedback forms"],
                ["03", "Survey & NPS responses"],
                ["04", "Support ticket exports"],
              ].map(([num, label]) => (
                <div key={num} className="flex items-center gap-3.5 py-3.5 border-b border-[var(--outline-variant)] text-sm group hover:bg-[var(--surface-high)]/50 transition-colors px-2 -mx-2 rounded-md">
                  <span className="font-mono text-[var(--on-surface-variant)] text-xs w-[70px] shrink-0 group-hover:text-[var(--primary)] transition-colors">{num}</span>
                  <span className="group-hover:translate-x-1 transition-transform">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-[84px]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[var(--primary)] mb-3 font-semibold">
            How it works
          </div>
          <h2 className="text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight mb-4 max-w-[640px]">
            One pipeline, four steps, no manual sorting.
          </h2>
          <p className="text-[var(--on-surface-variant)] text-base max-w-[560px] leading-relaxed mb-11">
            This is a genuine sequence — each step depends on the one before it.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-[1px] bg-[var(--outline-variant)] border border-[var(--outline-variant)] rounded-xl overflow-hidden">
            {[
              { num: "01", title: "Collect", desc: "Bulk imports and embedded forms feed into one place — no more spreadsheets living in five different inboxes." },
              { num: "02", title: "Cluster", desc: "Feedback is automatically grouped by topic, so a hundred versions of the same complaint become one cluster with a count." },
              { num: "03", title: "Visualize", desc: "Sentiment and volume, charted over time — see what's trending up or down before it shows up in churn." },
              { num: "04", title: "Respond", desc: "AI drafts a reply using the full context of that customer and cluster — you review, edit, and send." },
            ].map((step) => (
              <div key={step.num} className="bg-[var(--surface)] p-7 group hover:bg-[var(--surface-high)] transition-colors">
                <div className="font-mono text-xs text-[var(--primary)] mb-3.5 group-hover:scale-110 transition-transform origin-left">{step.num}</div>
                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-[13.5px] text-[var(--on-surface-variant)] leading-[1.55]">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section id="dashboard" className="py-[84px]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[var(--primary)] mb-3 font-semibold">
            Product
          </div>
          <h2 className="text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight mb-4 max-w-[640px]">
            See what your customers are actually saying — grouped, not buried.
          </h2>
          <p className="text-[var(--on-surface-variant)] text-base max-w-[560px] leading-relaxed mb-11">
            Every cluster carries a sentiment badge from the same three-color system used across the whole product.
          </p>
          <div className="surface-signal border border-[var(--outline-variant)] rounded-xl p-8">
            {[
              { title: "Checkout is confusing on mobile", count: "42 responses", sentiment: "Negative", color: "tertiary" },
              { title: "Support response time", count: "18 responses", sentiment: "Mixed", color: "primary" },
              { title: "New dashboard layout", count: "96 responses", sentiment: "Positive", color: "secondary" },
              { title: "Pricing page clarity", count: "11 responses", sentiment: "Negative", color: "tertiary" },
            ].map((item, idx) => (
              <div key={idx}
                className={`flex items-center justify-between bg-[var(--surface)] border border-[var(--outline-variant)] rounded-lg py-4 px-4.5 ${idx < 3 ? "mb-2.5" : ""} hover:border-[var(--primary)]/40 hover:shadow-md transition-all group`}>
                <div>
                  <span className="font-semibold text-[14.5px] group-hover:text-[var(--primary)] transition-colors">{item.title}</span>
                  <span className="font-mono text-[12.5px] text-[var(--on-surface-variant)] ml-2">{item.count}</span>
                </div>
                <span className={`text-[11.5px] font-semibold py-1 px-3 rounded-full ${
                  item.color === "tertiary"
                    ? "bg-[var(--tertiary)]/15 text-[var(--tertiary)]"
                    : item.color === "primary"
                    ? "bg-[var(--primary-container)] text-[var(--primary)]"
                    : "bg-[var(--secondary)]/15 text-[var(--secondary)]"
                }`}>{item.sentiment}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Reply */}
      <section id="ai-reply" className="py-[84px]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[var(--primary)] mb-3 font-semibold">
            The AI edge
          </div>
          <h2 className="text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight mb-4 max-w-[640px]">
            Replies drafted with real context — not a generic template.
          </h2>
          <p className="text-[var(--on-surface-variant)] text-base max-w-[560px] leading-relaxed mb-11">
            This is the one place in the product with a glass surface — a visual cue that the model is reading through to the content beneath it.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl p-6 border border-[var(--outline-variant)] bg-[var(--surface)] hover:shadow-lg transition-shadow">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mb-3.5">Feedback</div>
              <blockquote className="text-[15px] leading-[1.6] mb-4">
                &quot;Checkout kept freezing on my phone right at the payment step. Tried twice, gave up and bought it from a competitor instead.&quot;
              </blockquote>
              <div className="flex gap-2">
                <span className="inline-block text-[11.5px] font-mono text-[var(--on-surface-variant)] border border-[var(--outline)] rounded-md py-[3px] px-2">Plan: Pro</span>
                <span className="inline-block text-[11.5px] font-mono text-[var(--on-surface-variant)] border border-[var(--outline)] rounded-md py-[3px] px-2">Cluster: Checkout / mobile</span>
              </div>
            </div>
            <div className="rounded-xl p-6 border border-[var(--outline-variant)] surface-lifted hover:shadow-lg transition-shadow"
              style={{ animation: "glow-ring 3s ease-in-out infinite" }}>
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--on-surface-variant)] mb-3.5">Draft reply</div>
              <p className="text-[14.5px] leading-[1.65] mb-4">
                &quot;Sorry the mobile checkout let you down — that&apos;s a known issue on the payment step we&apos;re actively fixing. I&apos;ve refunded the difference if you&apos;d like to try again, and I&apos;ll follow up personally once it&apos;s resolved.&quot;
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10.5px] font-mono bg-[var(--primary-container)] text-[var(--primary)] py-[3px] px-[9px] rounded-full">Plan tier</span>
                <span className="text-[10.5px] font-mono bg-[var(--primary-container)] text-[var(--primary)] py-[3px] px-[9px] rounded-full">42 similar reports</span>
                <span className="text-[10.5px] font-mono bg-[var(--primary-container)] text-[var(--primary)] py-[3px] px-[9px] rounded-full">Open bug #1189</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-[84px]">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="flex justify-between flex-wrap gap-8 border-y border-[var(--outline-variant)] py-10">
            {[
              { value: "4.2M", label: "feedback items processed" },
              { value: "<190ms", label: "avg. clustering latency" },
              { value: "99.95%", label: "uptime, last 12 months" },
              { value: "31", label: "languages supported" },
            ].map((stat) => (
              <div key={stat.label} className="group">
                <div className="font-mono text-[30px] text-[var(--on-background)] group-hover:text-[var(--primary)] transition-colors">{stat.value}</div>
                <div className="text-[var(--on-surface-variant)] text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-[100px]" id="cta">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="font-mono text-[11.5px] tracking-[0.1em] uppercase text-[var(--primary)] mb-3 font-semibold">
            Get started
          </div>
          <h2 className="text-[clamp(26px,3.4vw,36px)] font-semibold tracking-tight mx-auto mb-6 max-w-[640px]">
            Stop guessing what your customers want. Read the signal.
          </h2>
          <Link href="/dashboard" className="btn-primary text-sm px-5 py-2.5 rounded-lg"
            style={{ animation: "glow-ring 3s ease-in-out infinite" }}>
            Start free — no card required
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--outline-variant)] py-8">
        <div className="max-w-[1120px] mx-auto px-6 flex justify-between items-center text-[13px] text-[var(--on-surface-variant)]">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="icon" />
            <span>© {new Date().getFullYear()} LOOP</span>
          </div>
          <div>Privacy · Terms · Docs</div>
        </div>
      </footer>
    </div>
  );
}
