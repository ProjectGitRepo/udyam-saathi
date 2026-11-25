/**
 * Minimal A2UI 1.0 implementation (https://a2ui.org/specification/v1.0-a2ui/).
 *
 * Supported agent → renderer messages: createSurface, updateComponents,
 * updateDataModel, deleteSurface. Renderer → agent: action.
 * Data binding: {"@path": "/json/pointer"} (relative inside templates) and
 * {"@call": fn, args} for a subset of basic-catalog functions.
 */

export const A2UI_VERSION = "1.0" as const;
export const BASIC_CATALOG = "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json";
export const UDYAM_CATALOG = "https://udyam-saathi.app/a2ui/catalogs/udyam/v1/catalog.json";

export type DataBinding = { "@path": string };
export type FunctionCall = { "@call": string; args?: Record<string, unknown>; catalogId?: string };
export type Dynamic<T> = T | DataBinding | FunctionCall;

export type ChildList = string[] | { componentId: string; path: string };

export type Action =
  | { event: { name: string; userMessage?: Dynamic<string>; context?: Record<string, Dynamic<unknown>> } }
  | { functionCall: FunctionCall };

export interface Component {
  id: string;
  component: string;
  "@catalogId"?: string;
  "@accessibility"?: { label?: Dynamic<string>; description?: Dynamic<string>; live?: "off" | "polite" | "assertive" };
  [prop: string]: unknown;
}

export type AgentToRenderer =
  | { version: "1.0"; createSurface: { surfaceId: string; catalogId?: string; sendDataModel?: boolean; components?: Component[]; dataModel?: Record<string, unknown> } }
  | { version: "1.0"; updateComponents: { surfaceId: string; components: Component[] } }
  | { version: "1.0"; updateDataModel: { surfaceId: string; path?: string; value: unknown } }
  | { version: "1.0"; deleteSurface: { surfaceId: string } };

export interface ActionMessage {
  version: "1.0";
  action: {
    name: string;
    surfaceId: string;
    sourceComponentId: string;
    timestamp: string;
    context: Record<string, unknown>;
    userMessage?: string;
  };
}

export interface SurfaceState {
  surfaceId: string;
  catalogId: string;
  components: Record<string, Component>;
  dataModel: Record<string, unknown>;
}

export type Surfaces = Record<string, SurfaceState>;

// ---------- JSON Pointer ----------

function tokens(pointer: string): string[] {
  if (!pointer || pointer === "/") return [];
  return pointer
    .replace(/^\//, "")
    .split("/")
    .map((t) => t.replace(/~1/g, "/").replace(/~0/g, "~"));
}

export function getPointer(obj: unknown, pointer: string): unknown {
  let cur: unknown = obj;
  for (const t of tokens(pointer)) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[t];
  }
  return cur;
}

export function setPointer<T extends Record<string, unknown>>(obj: T, pointer: string, value: unknown): T {
  const ts = tokens(pointer);
  if (ts.length === 0) return (value ?? {}) as T;
  const root: Record<string, unknown> = Array.isArray(obj) ? ([...obj] as unknown as Record<string, unknown>) : { ...obj };
  let cur = root;
  for (let i = 0; i < ts.length - 1; i++) {
    const next = cur[ts[i]];
    const copy = Array.isArray(next) ? [...next] : next && typeof next === "object" ? { ...(next as object) } : {};
    cur[ts[i]] = copy;
    cur = copy as Record<string, unknown>;
  }
  const last = ts[ts.length - 1];
  if (value === null) delete cur[last];
  else cur[last] = value;
  return root as T;
}

export function joinPath(scope: string, path: string): string {
  if (path.startsWith("/")) return path;
  return `${scope.replace(/\/$/, "")}/${path}`;
}

// ---------- Message application ----------

export function applyMessages(surfaces: Surfaces, messages: AgentToRenderer[]): Surfaces {
  let next = { ...surfaces };
  for (const m of messages) {
    if ("createSurface" in m) {
      const c = m.createSurface;
      const components: Record<string, Component> = {};
      for (const comp of c.components ?? []) components[comp.id] = comp;
      next[c.surfaceId] = { surfaceId: c.surfaceId, catalogId: c.catalogId ?? BASIC_CATALOG, components, dataModel: c.dataModel ?? {} };
    } else if ("updateComponents" in m) {
      const s = next[m.updateComponents.surfaceId];
      if (!s) continue;
      const components = { ...s.components };
      for (const comp of m.updateComponents.components) components[comp.id] = comp;
      next[s.surfaceId] = { ...s, components };
    } else if ("updateDataModel" in m) {
      const s = next[m.updateDataModel.surfaceId];
      if (!s) continue;
      next[s.surfaceId] = { ...s, dataModel: setPointer(s.dataModel, m.updateDataModel.path ?? "/", m.updateDataModel.value) };
    } else if ("deleteSurface" in m) {
      next = { ...next };
      delete next[m.deleteSurface.surfaceId];
    }
  }
  return next;
}

// ---------- Dynamic value resolution ----------

const isBinding = (v: unknown): v is DataBinding => !!v && typeof v === "object" && "@path" in (v as object);
const isCall = (v: unknown): v is FunctionCall => !!v && typeof v === "object" && "@call" in (v as object);

export function resolve(value: unknown, model: Record<string, unknown>, scope = ""): unknown {
  if (isBinding(value)) return getPointer(model, joinPath(scope, value["@path"]));
  if (isCall(value)) return callFunction(value, model, scope);
  return value;
}

export function resolveString(value: unknown, model: Record<string, unknown>, scope = ""): string {
  const v = resolve(value, model, scope);
  return v == null ? "" : String(v);
}

function callFunction(fc: FunctionCall, model: Record<string, unknown>, scope: string): unknown {
  const a: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fc.args ?? {})) a[k] = Array.isArray(v) ? v.map((x) => resolve(x, model, scope)) : resolve(v, model, scope);
  switch (fc["@call"]) {
    case "formatCurrency": {
      const n = Number(a.value ?? 0);
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: String(a.currency ?? "INR"), maximumFractionDigits: Number(a.decimals ?? 0) }).format(n);
    }
    case "formatNumber":
      return new Intl.NumberFormat("en-IN", { maximumFractionDigits: Number(a.decimals ?? 0), useGrouping: a.grouping !== false }).format(Number(a.value ?? 0));
    case "formatDate": {
      const d = new Date(String(a.value));
      return isNaN(d.getTime()) ? String(a.value) : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
    case "formatString":
      return String(a.value ?? "").replace(/\$\{([^}]+)\}/g, (_, p: string) => {
        const v = getPointer(model, joinPath(scope, p.trim()));
        return v == null ? "" : String(v);
      });
    case "pluralize": {
      const n = Number(a.value);
      return String((n === 0 && a.zero) || (n === 1 && a.one) || a.other);
    }
    case "not":
      return !a.value;
    case "and":
      return (a.values as unknown[]).every(Boolean);
    case "or":
      return (a.values as unknown[]).some(Boolean);
    case "required":
      return { valid: a.value !== undefined && a.value !== null && a.value !== "" };
    default:
      return undefined;
  }
}

export function resolveContext(ctx: Record<string, unknown> | undefined, model: Record<string, unknown>, scope: string) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx ?? {})) out[k] = resolve(v, model, scope);
  return out;
}
