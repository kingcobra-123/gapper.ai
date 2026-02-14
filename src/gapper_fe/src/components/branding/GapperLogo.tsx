"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface GapperLogoProps {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
}

export function GapperLogo({ className, markClassName, showWordmark = true }: GapperLogoProps) {
  const id = useId().replace(/:/g, "");
  const glowId = `glow-${id}`;
  const cutEdgeId = `cut-edge-${id}`;
  const revealMaskId = `reveal-cut-${id}`;

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 62 62"
        role="img"
        aria-label="Gapper AI logo"
        className={cn("gapper-logo h-8 w-8 shrink-0", markClassName)}
      >
        <defs>
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id={cutEdgeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(34,211,238,0)" />
            <stop offset="0.55" stopColor="rgba(34,211,238,0.55)" />
            <stop offset="1" stopColor="rgba(52,211,153,0)" />
          </linearGradient>

          <mask id={revealMaskId}>
            <rect x="0" y="0" width="62" height="62" fill="black" />
            <rect x="0" y="50" width="62" height="0" fill="white">
              <animate
                attributeName="y"
                values="50;8;8;50"
                dur="1.8s"
                repeatCount="indefinite"
                keyTimes="0;0.55;0.75;1"
              />
              <animate
                attributeName="height"
                values="0;42;42;0"
                dur="1.8s"
                repeatCount="indefinite"
                keyTimes="0;0.55;0.75;1"
              />
            </rect>
          </mask>
        </defs>

        <path
          className="gapper-logo-layer gapper-logo-layer-a gapper-logo-pulse-3"
          d="M31 10 49 22 31 34 13 22 31 10Z"
          filter={`url(#${glowId})`}
        />
        <path
          className="gapper-logo-layer gapper-logo-layer-b gapper-logo-pulse-2"
          d="M31 18 49 30 31 42 13 30 31 18Z"
          filter={`url(#${glowId})`}
        />
        <path className="gapper-logo-layer gapper-logo-pulse-1" d="M31 26 49 38 31 50 13 38 31 26Z" />

        <g mask={`url(#${revealMaskId})`}>
          <rect x="29" y="8" width="4" height="42" rx="2" fill="hsl(var(--background))" opacity="0.98" />
          <rect x="28.6" y="8" width="4.8" height="42" rx="2.4" fill={`url(#${cutEdgeId})`} opacity="0.55" />
        </g>
      </svg>

      {showWordmark ? (
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-wide">Gapper AI</span>
          <span className="block text-[11px] text-muted">Trader Terminal</span>
        </span>
      ) : null}
    </div>
  );
}
