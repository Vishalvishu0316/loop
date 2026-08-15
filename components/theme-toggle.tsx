"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  
  if (!mounted) return <div className="h-9 w-9 rounded-md border border-[var(--outline)]" />;
  
  const isDark = resolvedTheme === "dark";
  
  return (
    <button
      className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--outline)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-high)] hover:text-[var(--on-background)] transition"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
