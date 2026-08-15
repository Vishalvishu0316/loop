"use client";

/**
 * <Logo /> – Vector-based brand mark.
 *
 * Renders an inline SVG so colours follow CSS variables and remain
 * crisp in both light and dark themes. The signal line pulses gently.
 */

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "full" | "icon";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
}

const SIZES: Record<LogoSize, { icon: number; text: number; gap: number }> = {
  sm: { icon: 28, text: 15, gap: 6 },
  md: { icon: 36, text: 19, gap: 8 },
  lg: { icon: 48, text: 26, gap: 10 },
};

export function Logo({ size = "md", variant = "full", className = "" }: LogoProps) {
  const s = SIZES[size];
  const iconSize = s.icon;

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Broken-ring */}
      <circle
        cx="45"
        cy="50"
        r="32"
        stroke="var(--on-background)"
        strokeWidth="7"
        strokeDasharray="184.3 16.8"
        strokeLinecap="round"
        fill="none"
      />
      {/* Signal line – animated pulse */}
      <path
        d="M 75 50 L 84 50 L 87 40 L 92 60 L 95 50 L 104 50"
        stroke="var(--primary)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ animation: "signal-pulse 2.4s ease-in-out infinite" }}
      />
    </svg>
  );

  if (variant === "icon") {
    return <span className={`inline-flex items-center ${className}`}>{icon}</span>;
  }

  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: s.gap }}>
      {icon}
      <span
        className="font-bold tracking-wide"
        style={{
          fontSize: s.text,
          color: "var(--on-background)",
          lineHeight: 1,
        }}
      >
        LOOP
      </span>
    </span>
  );
}
