import type { ButtonHTMLAttributes, ReactNode } from "react";

export type Tone = "neutral" | "danger" | "warn" | "ok" | "info" | "accent";

const toneBadge: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-2 border-line",
  danger: "bg-danger-soft text-danger border-[#f5d0cc]",
  warn: "bg-warn-soft text-warn border-[#f1dfb8]",
  ok: "bg-ok-soft text-ok border-[#cbe7d6]",
  info: "bg-info-soft text-info border-[#cfdcf0]",
  accent: "bg-accent-soft text-accent border-[#cfe0d7]",
};

export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border px-1.5 py-px text-[11.5px] font-medium ${toneBadge[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

type BtnVariant = "default" | "primary" | "borderless" | "danger";
const btn: Record<BtnVariant, string> = {
  default: "border border-line-strong bg-surface text-ink hover:bg-sunken",
  primary: "border border-accent bg-accent text-white hover:bg-accent-hover",
  borderless: "border border-transparent text-ink-2 hover:bg-sunken",
  danger: "border border-danger bg-danger text-white hover:opacity-90",
};

export function Button({ variant = "default", size = "md", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-[13.5px]";
  return <button {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${btn[variant]} ${className}`} />;
}

export function Panel({ title, actions, children, className = "", bodyClass = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-line bg-surface ${className}`}>
      {(title || actions) && (
        <header className="flex h-12 items-center justify-between gap-3 border-b border-line px-4">
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const toneText: Record<Tone, string> = {
  neutral: "text-ink",
  danger: "text-danger",
  warn: "text-warn",
  ok: "text-ok",
  info: "text-info",
  accent: "text-accent",
};

export function Metric({ label, value, caption, tone = "neutral" }: { label: ReactNode; value: ReactNode; caption?: ReactNode; tone?: Tone }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[12px] text-muted">{label}</p>
      <p className={`tabular mt-1 text-[22px] font-semibold tracking-tight ${toneText[tone]}`}>{value}</p>
      {caption && <p className="mt-0.5 truncate text-[12px] text-muted">{caption}</p>}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: ReactNode; value: ReactNode; tone?: Tone; strong?: boolean }[] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((it, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-[12.5px] text-muted">{it.label}</dt>
          <dd className={`tabular text-right text-[13px] ${it.strong ? "font-semibold" : ""} ${toneText[it.tone ?? "neutral"]}`}>{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type StepStatus = "done" | "current" | "todo";

export function Steps({ items }: { items: { label: ReactNode; caption?: ReactNode; status: StepStatus }[] }) {
  return (
    <ol className="relative space-y-3">
      {items.map((s, i) => (
        <li key={i} className="relative flex gap-3">
          {i < items.length - 1 && <span className="absolute left-[7px] top-5 h-[calc(100%-4px)] w-px bg-line" />}
          <span
            className={`relative mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border ${
              s.status === "done" ? "border-accent bg-accent" : s.status === "current" ? "border-accent bg-surface" : "border-line-strong bg-surface"
            }`}
          >
            {s.status === "done" && (
              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 6.5l2.2 2L9.5 3.5" />
              </svg>
            )}
            {s.status === "current" && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          </span>
          <div className="min-w-0">
            <p className={`text-[13px] ${s.status === "todo" ? "text-muted" : "font-medium text-ink"}`}>{s.label}</p>
            {s.caption && <p className="text-[12px] text-muted">{s.caption}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Callout({ tone = "info", title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  const map: Record<Tone, string> = {
    neutral: "border-line bg-sunken",
    danger: "border-[#f5d0cc] bg-danger-soft",
    warn: "border-[#f1dfb8] bg-warn-soft",
    ok: "border-[#cbe7d6] bg-ok-soft",
    info: "border-[#cfdcf0] bg-info-soft",
    accent: "border-[#cfe0d7] bg-accent-soft",
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${map[tone]}`}>
      {title && <p className={`text-[12.5px] font-semibold ${toneText[tone]}`}>{title}</p>}
      <div className="text-[12.5px] text-ink-2">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-8 text-center text-[13px] text-muted">{children}</p>;
}
