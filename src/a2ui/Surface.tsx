"use client";

import { Fragment, useState, type ComponentType, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Banknote, Calendar, Check, Circle, FileText, IndianRupee, Landmark, Scale, Send, Clock } from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  arrowForward: ArrowRight,
  money: Banknote,
  calendarToday: Calendar,
  check: Check,
  description: FileText,
  rupee: IndianRupee,
  bank: Landmark,
  law: Scale,
  send: Send,
  schedule: Clock,
};
import { Badge, Button, Callout, KeyValue, Metric, Steps, type StepStatus, type Tone } from "@/ui/primitives";
import { getPointer, joinPath, resolve, resolveContext, resolveString, type Action, type ActionMessage, type ChildList, type SurfaceState } from "./protocol";

interface Ctx {
  surface: SurfaceState;
  onAction: (msg: ActionMessage) => void;
  onDataChange: (surfaceId: string, path: string, value: unknown) => void;
}

/**
 * Catalog — basic components (A2UI basic catalog subset) + Udyam domain
 * components. Agents may only place components listed here; anything else
 * renders a visible placeholder instead of executing.
 */
export const CATALOG_COMPONENTS = [
  "Text", "Row", "Column", "List", "Card", "Divider", "Button", "TextField", "CheckBox", "ChoicePicker", "Icon", "Tabs",
  "Metric", "Badge", "KeyValue", "Table", "Steps", "Document", "Callout",
] as const;

export function A2UISurface({ surface, onAction, onDataChange }: { surface: SurfaceState; onAction: Ctx["onAction"]; onDataChange: Ctx["onDataChange"] }) {
  const ctx: Ctx = { surface, onAction, onDataChange };
  if (!surface.components.root) return <div className="h-10 animate-pulse rounded-md bg-sunken" />;
  return <Node id="root" ctx={ctx} scope="" />;
}

function Node({ id, ctx, scope }: { id: string; ctx: Ctx; scope: string }): ReactNode {
  const c = ctx.surface.components[id];
  if (!c) return <div className="h-6 animate-pulse rounded bg-sunken" />; // placeholder for not-yet-streamed ref
  const r = (v: unknown) => resolve(v, ctx.surface.dataModel, scope);
  const rs = (v: unknown) => resolveString(v, ctx.surface.dataModel, scope);

  const renderChildren = (list: unknown): ReactNode => {
    const cl = list as ChildList | undefined;
    if (!cl) return null;
    if (Array.isArray(cl)) return cl.map((cid) => <Node key={cid} id={cid} ctx={ctx} scope={scope} />);
    const arr = getPointer(ctx.surface.dataModel, joinPath(scope, cl.path));
    if (!Array.isArray(arr)) return null;
    const base = joinPath(scope, cl.path);
    return arr.map((_, i) => <Node key={i} id={cl.componentId} ctx={ctx} scope={`${base}/${i}`} />);
  };

  const fire = (action: Action | undefined) => {
    if (!action) return;
    if ("event" in action) {
      ctx.onAction({
        version: "1.0",
        action: {
          name: action.event.name,
          surfaceId: ctx.surface.surfaceId,
          sourceComponentId: c.id,
          timestamp: new Date().toISOString(),
          context: resolveContext(action.event.context, ctx.surface.dataModel, scope),
          userMessage: action.event.userMessage ? rs(action.event.userMessage) : undefined,
        },
      });
    } else if (action.functionCall["@call"] === "openUrl") {
      const url = rs(action.functionCall.args?.url);
      if (/^https:\/\//.test(url)) window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const bindPath = (v: unknown) => (v && typeof v === "object" && "@path" in v ? joinPath(scope, (v as { "@path": string })["@path"]) : null);

  switch (c.component) {
    case "Text": {
      const variant = c.variant === "caption" ? "caption" : "body";
      return <MarkdownLite text={rs(c.text)} caption={variant === "caption"} />;
    }
    case "Row":
      return <div className={`flex flex-wrap gap-2 ${justify(c.justify)} ${align(c.align, "center")}`}>{renderChildren(c.children)}</div>;
    case "Column":
      return <div className={`flex flex-col gap-2.5 ${justify(c.justify)}`}>{renderChildren(c.children)}</div>;
    case "List":
      return <div className={c.direction === "horizontal" ? "flex gap-2 overflow-x-auto" : "flex flex-col divide-y divide-line"}>{renderChildren(c.children)}</div>;
    case "Card":
      return <div className="rounded-md border border-line bg-surface p-3">{c.child ? <Node id={String(c.child)} ctx={ctx} scope={scope} /> : null}</div>;
    case "Divider":
      return <hr className="border-line" />;
    case "Button": {
      const variant = c.variant === "primary" ? "primary" : c.variant === "borderless" ? "borderless" : "default";
      return (
        <Button size="sm" variant={variant} onClick={() => fire(c.action as Action)}>
          {(() => {
            // Button labels inherit the button's colour (a Text child would force body ink colour).
            const child = c.child ? ctx.surface.components[String(c.child)] : undefined;
            if (child?.component === "Text") return <span>{rs(child.text)}</span>;
            return c.child ? <Node id={String(c.child)} ctx={ctx} scope={scope} /> : "Action";
          })()}
        </Button>
      );
    }
    case "Icon": {
      const Cmp = ICONS[rs(c.name)] ?? Circle;
      return <Cmp className="h-3.5 w-3.5" />;
    }
    case "TextField": {
      const path = bindPath(c.value);
      const val = rs(c.value);
      const isLong = c.variant === "longText";
      const common = {
        value: val,
        placeholder: rs(c.placeholder),
        onChange: (e: { target: { value: string } }) => path && ctx.onDataChange(ctx.surface.surfaceId, path, c.variant === "number" ? Number(e.target.value) : e.target.value),
        className: "w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent",
      };
      return (
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-ink-2">{rs(c.label)}</span>
          {isLong ? <textarea rows={3} {...common} /> : <input type={c.variant === "number" ? "number" : c.variant === "obscured" ? "password" : "text"} {...common} />}
        </label>
      );
    }
    case "CheckBox": {
      const path = bindPath(c.value);
      return (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="accent-accent" checked={Boolean(r(c.value))} onChange={(e) => path && ctx.onDataChange(ctx.surface.surfaceId, path, e.target.checked)} />
          {rs(c.label)}
        </label>
      );
    }
    case "ChoicePicker": {
      const path = bindPath(c.value);
      const selected = (r(c.value) as string[] | undefined) ?? [];
      const multi = c.variant === "multipleSelection";
      const options = (c.options as { label: unknown; value: string }[]) ?? [];
      return (
        <div>
          {c.label ? <p className="mb-1 text-[12px] font-medium text-ink-2">{rs(c.label)}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    if (!path) return;
                    const next = multi ? (on ? selected.filter((v) => v !== o.value) : [...selected, o.value]) : [o.value];
                    ctx.onDataChange(ctx.surface.surfaceId, path, next);
                  }}
                  className={`rounded-md border px-2.5 py-1 text-[12.5px] ${on ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-surface text-ink-2 hover:bg-sunken"}`}
                >
                  {rs(o.label)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "Tabs":
      return <TabsView tabs={(c.tabs as { title: unknown; child: string }[]) ?? []} rs={rs} render={(cid) => <Node id={cid} ctx={ctx} scope={scope} />} />;

    // ---- Udyam catalog ----
    case "Metric":
      return <Metric label={rs(c.label)} value={rs(c.value)} caption={c.caption ? rs(c.caption) : undefined} tone={(rs(c.tone) || "neutral") as Tone} />;
    case "Badge":
      return <Badge tone={(rs(c.tone) || "neutral") as Tone}>{rs(c.text)}</Badge>;
    case "KeyValue": {
      const items = ((c.items as { label: unknown; value: unknown; tone?: unknown; strong?: boolean }[]) ?? []).map((it) => ({
        label: rs(it.label),
        value: rs(it.value),
        tone: (rs(it.tone) || "neutral") as Tone,
        strong: it.strong,
      }));
      return <KeyValue items={items} />;
    }
    case "Steps": {
      const items = ((c.items as { label: unknown; caption?: unknown; status: unknown }[]) ?? []).map((s) => ({
        label: rs(s.label),
        caption: s.caption ? rs(s.caption) : undefined,
        status: (rs(s.status) || "todo") as StepStatus,
      }));
      return <Steps items={items} />;
    }
    case "Callout":
      return (
        <Callout tone={(rs(c.tone) || "info") as Tone} title={c.title ? rs(c.title) : undefined}>
          {rs(c.text)}
        </Callout>
      );
    case "Document":
      return (
        <div className="overflow-hidden rounded-md border border-line">
          <div className="flex items-center justify-between border-b border-line bg-sunken px-3 py-1.5">
            <span className="text-[12px] font-medium text-ink-2">{rs(c.title)}</span>
            {c.meta ? <span className="text-[11.5px] text-muted">{rs(c.meta)}</span> : null}
          </div>
          <pre className="pane-scroll max-h-72 overflow-auto whitespace-pre-wrap px-3 py-2.5 font-sans text-[12.5px] leading-relaxed text-ink">{rs(c.body)}</pre>
        </div>
      );
    case "Table": {
      const columns = (c.columns as { key: string; label: unknown; align?: "right"; format?: "inr" | "badge" | "days" }[]) ?? [];
      const rowsPath = bindPath(c.rows);
      const rows = (r(c.rows) as Record<string, unknown>[]) ?? [];
      return (
        <div className="overflow-hidden rounded-md border border-line">
          <table className="w-full text-[12.5px]">
            <thead className="bg-sunken text-muted">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-2.5 py-1.5 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}>
                    {rs(col.label)}
                  </th>
                ))}
                {c.rowAction ? <th className="w-px" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row, i) => (
                <tr key={i} className="hover:bg-canvas">
                  {columns.map((col) => (
                    <td key={col.key} className={`tabular px-2.5 py-1.5 ${col.align === "right" ? "text-right" : ""}`}>
                      {cell(row[col.key], col.format, row)}
                    </td>
                  ))}
                  {c.rowAction ? (
                    <td className="px-2 py-1 text-right">
                      <RowAction label={rs(c.rowActionLabel) || "Open"} onClick={() => fireRow(c.rowAction as Action, rowsPath ? `${rowsPath}/${i}` : scope)} />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      function fireRow(action: Action, rowScope: string) {
        if (!("event" in action)) return;
        ctx.onAction({
          version: "1.0",
          action: {
            name: action.event.name,
            surfaceId: ctx.surface.surfaceId,
            sourceComponentId: c!.id,
            timestamp: new Date().toISOString(),
            context: resolveContext(action.event.context, ctx.surface.dataModel, rowScope),
          },
        });
      }
    }
    default:
      return <div className="rounded border border-dashed border-line-strong px-2 py-1 text-[11px] text-muted">Unsupported component: {c.component}</div>;
  }
}

function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded px-1.5 py-0.5 text-[12px] font-medium text-accent hover:bg-accent-soft">
      {label}
    </button>
  );
}

function cell(v: unknown, format: string | undefined, row: Record<string, unknown>): ReactNode {
  if (format === "inr") return `₹${Math.round(Number(v ?? 0)).toLocaleString("en-IN")}`;
  if (format === "badge") return <Badge tone={(row.tone as Tone) ?? "neutral"}>{String(v ?? "")}</Badge>;
  if (format === "days") return Number(v) > 0 ? <span className="text-danger">{String(v)}d</span> : <span className="text-muted">—</span>;
  return String(v ?? "");
}

function TabsView({ tabs, rs, render }: { tabs: { title: unknown; child: string }[]; rs: (v: unknown) => string; render: (id: string) => ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="mb-2 flex gap-3 border-b border-line text-[12.5px]">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setActive(i)} className={i === active ? "-mb-px border-b-2 border-accent pb-1.5 font-medium" : "pb-1.5 text-muted hover:text-ink"}>
            {rs(t.title)}
          </button>
        ))}
      </div>
      {tabs[active] ? render(tabs[active].child) : null}
    </div>
  );
}

function MarkdownLite({ text, caption }: { text: string; caption: boolean }) {
  const lines = text.split("\n");
  return (
    <div className={caption ? "text-[12px] text-muted" : "text-[13px] text-ink"}>
      {lines.map((ln, i) => {
        const h = /^(#{1,3})\s+(.*)$/.exec(ln);
        if (h) {
          const size = h[1].length === 1 ? "text-[15px]" : h[1].length === 2 ? "text-[14px]" : "text-[13px]";
          return (
            <p key={i} className={`${size} font-semibold text-ink`}>
              {inline(h[2])}
            </p>
          );
        }
        if (/^\s*[-•]\s+/.test(ln))
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="text-faint">–</span>
              <span>{inline(ln.replace(/^\s*[-•]\s+/, ""))}</span>
            </p>
          );
        return ln.trim() === "" ? <div key={i} className="h-1.5" /> : <p key={i}>{inline(ln)}</p>;
      })}
    </div>
  );
}

function inline(s: string): ReactNode {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>));
}

const justify = (j: unknown) =>
  ({ center: "justify-center", end: "justify-end", spaceBetween: "justify-between", spaceAround: "justify-around", spaceEvenly: "justify-evenly" })[String(j)] ?? "justify-start";
const align = (a: unknown, d: string) => ({ start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" })[String(a ?? d)] ?? "items-center";
