"use client";

import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const spring = { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.8 };
export const softSpring = { type: "spring" as const, stiffness: 180, damping: 24 };

const fmt = (n: number, prefix: string) => `${prefix}${Math.round(n).toLocaleString("en-IN")}`;

/** Animated number that glides to its new value (no re-render per frame). */
export function CountUp({ value, prefix = "₹", duration = 1.1, className }: { value: number; prefix?: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) {
      el.textContent = fmt(value, prefix);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = fmt(v, prefix)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, prefix, duration, reduce, inView]);

  return (
    <span ref={ref} className={`tabular ${className ?? ""}`}>
      {fmt(0, prefix)}
    </span>
  );
}

/** Fade + rise into view on scroll. */
export function Reveal({ children, delay = 0, y = 24, className, ...rest }: { children: ReactNode; delay?: number; y?: number; className?: string } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } } },
};
