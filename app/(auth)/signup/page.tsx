"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/logo";
import { Buildings, User, Envelope, LockKey, ArrowRight, SpinnerGap, WarningCircle } from "@phosphor-icons/react";
import { SignupSchema } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    workspaceName: "",
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);

    // Client-side Zod validation
    const validation = SignupSchema.safeParse(form);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const fieldName = String(issue.path[0]);
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const signupRes = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      if (!signupRes.ok) {
        const d = await signupRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Could not create workspace");
      }

      const loginRes = await signIn("credentials", {
        email: validation.data.email,
        password: validation.data.password,
        redirect: false,
      });
      if (loginRes?.error || !loginRes?.ok) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col justify-center w-full">
      {/* Mobile only logo */}
      <div className="md:hidden mb-6">
        <Logo size="md" variant="full" />
      </div>

      <div className="mb-6">
        <div className="inline-block font-mono text-[11px] uppercase tracking-widest text-[var(--primary)] font-semibold mb-1.5">
          Get Started
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--on-background)]">
          Create your workspace
        </h2>
        <p className="mt-1.5 text-xs text-[var(--on-surface-variant)] leading-relaxed">
          Set up a new organization to begin clustering customer feedback into ranked signals.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
            Workspace / Company Name
          </label>
          <div className="relative">
            <Buildings size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
            <input
              type="text"
              value={form.workspaceName}
              onChange={(e) => updateField("workspaceName", e.target.value)}
              placeholder="Acme SaaS Inc"
              className={`w-full rounded-xl border bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)]/60 focus:outline-none transition-all ${
                errors.workspaceName
                  ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                  : "border-[var(--outline)] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/25"
              }`}
            />
          </div>
          {errors.workspaceName && (
            <p className="mt-1.5 text-[11.5px] text-[var(--error)] flex items-center gap-1">
              <WarningCircle size={13} weight="fill" />
              {errors.workspaceName}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Your Name
            </label>
            <div className="relative">
              <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Jane Doe"
                className={`w-full rounded-xl border bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)]/60 focus:outline-none transition-all ${
                  errors.name
                    ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                    : "border-[var(--outline)] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/25"
                }`}
              />
            </div>
            {errors.name && (
              <p className="mt-1.5 text-[11.5px] text-[var(--error)] flex items-center gap-1">
                <WarningCircle size={13} weight="fill" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
              Work Email
            </label>
            <div className="relative">
              <Envelope size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="jane@company.com"
                className={`w-full rounded-xl border bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)]/60 focus:outline-none transition-all ${
                  errors.email
                    ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                    : "border-[var(--outline)] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/25"
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1.5 text-[11.5px] text-[var(--error)] flex items-center gap-1">
                <WarningCircle size={13} weight="fill" />
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
            Password
          </label>
          <div className="relative">
            <LockKey size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="At least 8 characters"
              className={`w-full rounded-xl border bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)]/60 focus:outline-none transition-all ${
                errors.password
                  ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                  : "border-[var(--outline)] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/25"
              }`}
            />
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-[11.5px] text-[var(--error)] flex items-center gap-1">
              <WarningCircle size={13} weight="fill" />
              {errors.password}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-[var(--on-surface-variant)]">
              Must be at least 8 characters long
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3 text-xs text-[var(--error)] flex items-center gap-2">
            <WarningCircle size={16} weight="fill" className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl btn-primary py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <SpinnerGap size={18} className="animate-spin" />
              <span>Creating workspace…</span>
            </>
          ) : (
            <>
              <span>Create Workspace & Continue</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-[var(--on-surface-variant)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Sign in instead →
        </Link>
      </div>
    </div>
  );
}
