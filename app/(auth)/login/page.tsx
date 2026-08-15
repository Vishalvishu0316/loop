"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/logo";
import { LockKey, Envelope, ArrowRight, SpinnerGap, Lightning, WarningCircle } from "@phosphor-icons/react";
import { LoginSchema } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoFilled, setDemoFilled] = useState(false);

  function fillDemo(roleEmail = "alex@acme.io", rolePassword = "Password123!") {
    setEmail(roleEmail);
    setPassword(rolePassword);
    setErrors({});
    setDemoFilled(true);
    setError(null);
    setTimeout(() => setDemoFilled(false), 2000);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setError(null);

    // Client-side Zod validation
    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") fieldErrors.email = issue.message;
        if (issue.path[0] === "password") fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: validation.data.email,
        password: validation.data.password,
        redirect: false,
      });
      if (res?.error || !res?.ok) {
        setError("Invalid email or password. Check your credentials or use the demo login.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Login failed. Please check your network connection and try again.");
    } finally {
      setLoading(false);
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
          Workspace Access
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--on-background)]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-xs text-[var(--on-surface-variant)] leading-relaxed">
          Enter your workspace credentials to access your feedback streams and AI reports.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
            Work Email
          </label>
          <div className="relative">
            <Envelope size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="you@company.com"
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

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--on-surface-variant)]">
            Password
          </label>
          <div className="relative">
            <LockKey size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)] pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              className={`w-full rounded-xl border bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--on-background)] placeholder:text-[var(--on-surface-variant)]/60 focus:outline-none transition-all ${
                errors.password
                  ? "border-[var(--error)] focus:ring-2 focus:ring-[var(--error)]/30"
                  : "border-[var(--outline)] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/25"
              }`}
            />
          </div>
          {errors.password && (
            <p className="mt-1.5 text-[11.5px] text-[var(--error)] flex items-center gap-1">
              <WarningCircle size={13} weight="fill" />
              {errors.password}
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
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign in to Workspace</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Credentials Box */}
      <div className="mt-6 rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface-low)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Lightning size={15} weight="fill" className="text-[var(--primary)]" />
            <span className="text-xs font-semibold text-[var(--on-background)]">Demo Accounts (from README)</span>
          </div>
          {demoFilled && (
            <span className="text-[11px] font-mono text-[var(--primary)] font-semibold animate-pulse">
              ✓ Credentials Loaded
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fillDemo("alex@acme.io", "Password123!")}
            className="flex flex-col items-center rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-2 hover:border-[var(--primary)] hover:bg-[var(--primary-container)]/20 transition-all text-center"
          >
            <span className="text-[11px] font-bold text-[var(--primary)]">Admin</span>
            <span className="text-[10px] text-[var(--on-surface-variant)] truncate w-full">alex@acme.io</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("sam@acme.io", "Password123!")}
            className="flex flex-col items-center rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-2 hover:border-[var(--primary)] hover:bg-[var(--primary-container)]/20 transition-all text-center"
          >
            <span className="text-[11px] font-bold text-[#8b5cf6]">Analyst</span>
            <span className="text-[10px] text-[var(--on-surface-variant)] truncate w-full">sam@acme.io</span>
          </button>
          <button
            type="button"
            onClick={() => fillDemo("jordan@acme.io", "Password123!")}
            className="flex flex-col items-center rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-2 hover:border-[var(--primary)] hover:bg-[var(--primary-container)]/20 transition-all text-center"
          >
            <span className="text-[11px] font-bold text-[#0ea5e9]">Viewer</span>
            <span className="text-[10px] text-[var(--on-surface-variant)] truncate w-full">jordan@acme.io</span>
          </button>
        </div>
        <div className="mt-2.5 text-center text-[10px] font-mono text-[var(--on-surface-variant)]">
          Password: <span className="text-[var(--on-background)] font-medium">Password123!</span>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-[var(--on-surface-variant)]">
        Don&apos;t have a workspace?{" "}
        <Link href="/signup" className="font-semibold text-[var(--primary)] hover:underline">
          Create one free →
        </Link>
      </div>
    </div>
  );
}
