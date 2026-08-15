"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { SessionUser, UserRole } from "@/lib/types";
import { ChartBar, Tray, TrendUp, ChatTeardropText, Files, Gear, SignOut } from "@phosphor-icons/react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ElementType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ElementType;
  minRole: UserRole;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: ChartBar, minRole: "VIEWER" },
  { href: "/inbox", label: "Feedback Inbox", icon: Tray, minRole: "VIEWER" },
  { href: "/trends", label: "Themes & Trends", icon: TrendUp, minRole: "VIEWER" },
  { href: "/ask", label: "Ask LOOP", icon: ChatTeardropText, minRole: "VIEWER" },
  { href: "/reports", label: "VOC Reports", icon: Files, minRole: "VIEWER" },
  { href: "/settings", label: "Settings", icon: Gear, minRole: "VIEWER" },
];

const ROLE_RANK: Record<UserRole, number> = { VIEWER: 1, ANALYST: 2, ADMIN: 3 };

function hasRole(userRole: UserRole, min: UserRole): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[min];
}

type Props = {
  children: React.ReactNode;
  user?: SessionUser | null;
  workspaceName?: string;
};

export function DashboardShell({ children, user, workspaceName }: Props) {
  const pathname = usePathname();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="animate-pulse text-[var(--on-surface-variant)] text-body-md">Loading workspace…</div>
        </div>
      </div>
    );
  }

  const visibleNav = NAV.filter((item) => hasRole(user.role, item.minRole));

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--on-background)]">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-[var(--outline)] bg-[var(--surface-low)] p-4 md:flex surface-signal">
        <div className="mb-8 px-2">
          <Logo size="md" variant="full" />
          <div className="text-label-md text-[var(--on-surface-variant)] mt-1 ml-0.5">Customer signals</div>
        </div>

        {workspaceName && (
          <div className="mb-6 rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-3">
            <div className="text-label-md text-[var(--on-surface-variant)]">Workspace</div>
            <div className="mt-1 truncate text-body-sm font-medium text-[var(--on-background)]">{workspaceName}</div>
          </div>
        )}

        <nav className="flex flex-col gap-1">
          {visibleNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm transition ${
                  active
                    ? "bg-[var(--surface-highest)] text-[var(--primary)] font-medium"
                    : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] hover:text-[var(--on-background)]"
                }`}
              >
                <Icon size={20} weight={active ? "fill" : "regular"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)] text-body-md font-semibold">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-body-sm font-medium">{user.name}</div>
              <div className="truncate text-[10px] text-[var(--on-surface-variant)]">
                {user.role.toLowerCase()} · {user.email}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
             <button
               type="button"
               onClick={() => signOut({ callbackUrl: "/login" })}
               className="flex flex-1 items-center justify-center gap-2 rounded-md border border-[var(--outline)] px-3 py-1.5 text-label-md text-[var(--on-surface-variant)] hover:border-[var(--on-background)] hover:text-[var(--on-background)] transition"
             >
               <SignOut size={16} /> Sign out
             </button>
             {ThemeToggle && <ThemeToggle />}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--outline)] bg-[color-mix(in_srgb,var(--surface)_80%,transparent)] px-4 py-3 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Logo size="sm" variant="full" />
          </div>
          <div className="hidden md:block text-label-md text-[var(--on-surface-variant)]" suppressHydrationWarning>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <span className="rounded-full border border-[var(--outline)] bg-[var(--surface)] px-2 py-1 text-label-md text-[var(--on-surface-variant)]">
              {user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
