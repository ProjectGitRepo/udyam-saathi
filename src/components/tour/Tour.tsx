"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Volume2, VolumeX, X } from "lucide-react";
import { speak, stopSpeaking } from "@/ui/speak";

export interface TourStep {
  /** value of a data-tour attribute; omit for a centered card */
  target?: string;
  title: string;
  body: string;
  /** run before the step is shown (navigate, open a panel…) */
  before?: () => void;
  /** custom primary action on the final step */
  cta?: { label: string; onClick: () => void };
  icon?: ReactNode;
}

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 8;
const spring = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.9 };

function measure(target?: string): Rect | null {
  if (!target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
}

export function Tour({ steps, open, onClose, lang, labels }: { steps: TourStep[]; open: boolean; onClose: () => void; lang: "hi" | "en"; labels: { next: string; back: string; skip: string; done: string; readAloud: string; stepOf: (a: number, b: number) => string } }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState({ w: 1200, h: 800 });
  const [autoRead, setAutoRead] = useState(false);
  const [th, setTh] = useState(260);
  const tipRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const step = steps[i];

  // Track the target continuously so the spotlight follows layout animations fluidly.
  useLayoutEffect(() => {
    if (!open) return;
    const tick = () => {
      const r = measure(step?.target);
      setRect((prev) => (prev && r && Math.abs(prev.x - r.x) < 0.5 && Math.abs(prev.y - r.y) < 0.5 && Math.abs(prev.w - r.w) < 0.5 && Math.abs(prev.h - r.h) < 0.5 ? prev : r));
      setVw((p) => (p.w === window.innerWidth && p.h === window.innerHeight ? p : { w: window.innerWidth, h: window.innerHeight }));
      const h = tipRef.current?.offsetHeight;
      if (h) setTh((p) => (Math.abs(p - h) < 1 ? p : h));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [open, step?.target]);

  const go = useCallback(
    (to: number) => {
      if (to < 0) return;
      if (to >= steps.length) {
        stopSpeaking();
        onClose();
        return;
      }
      steps[to].before?.();
      // bring target into view
      requestAnimationFrame(() => {
        const t = steps[to].target;
        const el = t ? document.querySelector<HTMLElement>(`[data-tour="${t}"]`) : null;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      setI(to);
    },
    [steps, onClose],
  );

  // Reset to first step whenever the tour is (re)opened
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setI(0);
  }

  useEffect(() => {
    if (open && autoRead && step) speak(`${step.title}. ${step.body}`, lang);
  }, [open, autoRead, step, lang]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopSpeaking();
        onClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i, go, onClose]);

  if (!step) return null;
  const centered = !rect;
  const last = i === steps.length - 1;

  // Tooltip placement using the card's measured height: below → above → right → left → screen edge away from target.
  const TW = Math.min(360, vw.w - 32);
  const GAP = 14;
  const clampX = (x: number) => Math.min(Math.max(16, x), vw.w - TW - 16);
  const clampY = (y: number) => Math.min(Math.max(16, y), vw.h - th - 16);
  let tx = vw.w / 2 - TW / 2;
  let ty = vw.h / 2 - th / 2;
  if (rect) {
    const cx = clampX(rect.x + rect.w / 2 - TW / 2);
    const sideY = clampY(rect.y + rect.h / 2 - th / 2);
    if (rect.y + rect.h + GAP + th <= vw.h - 16) [tx, ty] = [cx, rect.y + rect.h + GAP];
    else if (rect.y - GAP - th >= 16) [tx, ty] = [cx, rect.y - GAP - th];
    else if (rect.x + rect.w + GAP + TW <= vw.w - 16) [tx, ty] = [rect.x + rect.w + GAP, sideY];
    else if (rect.x - GAP - TW >= 16) [tx, ty] = [rect.x - GAP - TW, sideY];
    else [tx, ty] = [cx, rect.y + rect.h / 2 > vw.h / 2 ? 16 : vw.h - th - 16];
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="tour" className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          {/* Dimmed backdrop with animated cutout */}
          <svg className="absolute inset-0 h-full w-full" onClick={() => go(i + 1)}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <motion.rect
                  initial={false}
                  animate={rect ? { x: rect.x, y: rect.y, width: rect.w, height: rect.h, opacity: 1 } : { x: vw.w / 2, y: vw.h / 2, width: 0, height: 0, opacity: 0 }}
                  transition={spring}
                  rx={14}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(20,20,18,0.55)" mask="url(#tour-mask)" />
          </svg>

          {/* Glow ring */}
          {rect && (
            <motion.div
              className="pointer-events-none absolute rounded-[14px] ring-2 ring-[#f6c08a]"
              initial={false}
              animate={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              transition={spring}
            >
              <motion.div className="absolute inset-0 rounded-[14px] ring-4 ring-[#f6c08a]/50" animate={{ opacity: [0.8, 0, 0.8], scale: [1, 1.06, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
            </motion.div>
          )}

          {/* Tooltip card */}
          <motion.div
            ref={tipRef}
            role="dialog"
            aria-live="polite"
            className="absolute rounded-2xl border border-black/10 bg-white p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]"
            style={{ width: TW }}
            initial={false}
            animate={{ left: tx, top: ty, scale: centered ? 1.02 : 1 }}
            transition={spring}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-saffron">{labels.stepOf(i + 1, steps.length)}</span>
              <button
                onClick={() => {
                  stopSpeaking();
                  onClose();
                }}
                className="rounded-full p-1 text-muted hover:bg-sunken"
                aria-label={labels.skip}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                {step.icon && <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">{step.icon}</div>}
                <h3 className="font-display text-[26px] leading-tight">{step.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
              </motion.div>
            </AnimatePresence>

            <button
              onClick={() => {
                const next = !autoRead;
                setAutoRead(next);
                if (next) speak(`${step.title}. ${step.body}`, lang);
                else stopSpeaking();
              }}
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${autoRead ? "bg-saffron text-white" : "bg-saffron-soft text-saffron"}`}
            >
              {autoRead ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {labels.readAloud}
            </button>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-1">
                {steps.map((_, k) => (
                  <motion.span key={k} animate={{ width: k === i ? 18 : 6, backgroundColor: k <= i ? "#1d5a48" : "#d6d3cc" }} className="h-1.5 rounded-full" />
                ))}
              </div>
              <div className="flex gap-2">
                {i > 0 && (
                  <button onClick={() => go(i - 1)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line-strong text-ink-2 hover:bg-sunken" aria-label={labels.back}>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    if (last && step.cta) {
                      stopSpeaking();
                      onClose();
                      step.cta.onClick();
                    } else go(i + 1);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-accent px-5 text-[14px] font-semibold text-white"
                >
                  {last ? (step.cta?.label ?? labels.done) : labels.next} {!last && <ArrowRight className="h-4 w-4" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
