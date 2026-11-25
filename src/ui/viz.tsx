"use client";

import { motion } from "motion/react";

/** Animated circular score (0–100). */
export function ScoreRing({ value, size = 120, stroke = 10, color = "#1d5a48", track = "#ebe8e1", label }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.max(0, Math.min(100, value)) / 100) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display leading-none" style={{ fontSize: size * 0.3 }}>
          {value}
        </span>
        {label && <span className="mt-0.5 text-[11px] text-muted">{label}</span>}
      </div>
    </div>
  );
}

export const gradeColor = { A: "#17734a", B: "#1d4f91", C: "#c46a12", D: "#b42318" } as const;

/** Stacked weekly bars: likely (green) + at risk (saffron, striped). */
export function ForecastBars({ weeks, height = 150 }: { weeks: { label: string; expectedInr: number; atRiskInr: number }[]; height?: number }) {
  const max = Math.max(1, ...weeks.map((w) => w.expectedInr + w.atRiskInr));
  return (
    <div className="flex items-end gap-2.5" style={{ height: height + 28 }}>
      {weeks.map((w, i) => {
        const total = w.expectedInr + w.atRiskInr;
        const hE = (w.expectedInr / max) * height;
        const hR = (w.atRiskInr / max) * height;
        return (
          <div key={w.label} className="group flex flex-1 flex-col items-center gap-1.5">
            <div className="relative flex w-full flex-col justify-end" style={{ height }}>
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                ₹{Math.round(total).toLocaleString("en-IN")}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: hR }}
                transition={{ delay: 0.15 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full rounded-t-lg"
                style={{ background: "repeating-linear-gradient(135deg,#e2741d 0 6px,#ef9a55 6px 12px)" }}
              />
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: hE }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full bg-accent ${hR ? "" : "rounded-t-lg"} rounded-b-md`}
              />
              {total === 0 && <div className="h-1 w-full rounded-full bg-line" />}
            </div>
            <span className="text-[11px] text-muted">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
}
