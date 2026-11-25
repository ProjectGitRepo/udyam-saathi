import { A2UI_VERSION, UDYAM_CATALOG, type Action, type AgentToRenderer, type Component, type Dynamic } from "@/a2ui/protocol";

/** Tiny builder that emits a flat A2UI component list with auto IDs. */
export class SurfaceBuilder {
  components: Component[] = [];
  private n = 0;
  constructor(private prefix = "c") {}

  private add(component: string, props: Record<string, unknown>, id?: string): string {
    const cid = id ?? `${this.prefix}${++this.n}`;
    this.components.push({ id: cid, component, ...props });
    return cid;
  }

  text(text: Dynamic<string>, variant: "body" | "caption" = "body") {
    return this.add("Text", { text, variant });
  }
  row(children: string[], justify = "start", align = "center") {
    return this.add("Row", { children, justify, align });
  }
  column(children: string[], id?: string) {
    return this.add("Column", { children }, id);
  }
  card(child: string) {
    return this.add("Card", { child });
  }
  divider() {
    return this.add("Divider", { axis: "horizontal" });
  }
  button(label: string, action: Action, variant: "default" | "primary" | "borderless" = "default") {
    const child = this.text(label);
    return this.add("Button", { child, action, variant });
  }
  event(label: string, name: string, context: Record<string, unknown> = {}, variant: "default" | "primary" | "borderless" = "default") {
    return this.button(label, { event: { name, context } }, variant);
  }
  link(label: string, url: string, variant: "default" | "primary" | "borderless" = "default") {
    return this.button(label, { functionCall: { "@call": "openUrl", args: { url } } }, variant);
  }
  textField(label: string, path: string, variant: "shortText" | "longText" | "number" = "shortText", placeholder?: string) {
    return this.add("TextField", { label, value: { "@path": path }, variant, placeholder });
  }
  checkBox(label: string, path: string) {
    return this.add("CheckBox", { label, value: { "@path": path } });
  }
  choice(label: string, path: string, options: { label: string; value: string }[], multi = false) {
    return this.add("ChoicePicker", { label, value: { "@path": path }, options, variant: multi ? "multipleSelection" : "mutuallyExclusive", displayStyle: "chips" });
  }
  tabs(tabs: { title: string; child: string }[]) {
    return this.add("Tabs", { tabs });
  }
  // Udyam catalog
  metric(label: string, value: Dynamic<string>, tone = "neutral", caption?: string) {
    return this.add("Metric", { label, value, tone, caption, "@catalogId": UDYAM_CATALOG });
  }
  badge(text: string, tone = "neutral") {
    return this.add("Badge", { text, tone, "@catalogId": UDYAM_CATALOG });
  }
  keyValue(items: { label: string; value: Dynamic<string>; tone?: string; strong?: boolean }[]) {
    return this.add("KeyValue", { items, "@catalogId": UDYAM_CATALOG });
  }
  steps(items: { label: string; caption?: string; status: "done" | "current" | "todo" }[]) {
    return this.add("Steps", { items, "@catalogId": UDYAM_CATALOG });
  }
  callout(text: string, tone = "info", title?: string) {
    return this.add("Callout", { text, tone, title, "@catalogId": UDYAM_CATALOG });
  }
  document(title: string, body: Dynamic<string>, meta?: Dynamic<string>, id?: string) {
    return this.add("Document", { title, body, meta, "@catalogId": UDYAM_CATALOG }, id);
  }
  table(
    columns: { key: string; label: string; align?: "right"; format?: "inr" | "badge" | "days" }[],
    rowsPath: string,
    rowAction?: { name: string; context: Record<string, unknown>; label: string },
  ) {
    return this.add("Table", {
      columns,
      rows: { "@path": rowsPath },
      rowAction: rowAction ? { event: { name: rowAction.name, context: rowAction.context } } : undefined,
      rowActionLabel: rowAction?.label,
      "@catalogId": UDYAM_CATALOG,
    });
  }

  /** Finalise: wrap given children in the required "root" Column. */
  create(surfaceId: string, rootChildren: string[], dataModel: Record<string, unknown> = {}): AgentToRenderer {
    this.components.push({ id: "root", component: "Column", children: rootChildren });
    return { version: A2UI_VERSION, createSurface: { surfaceId, catalogId: UDYAM_CATALOG, components: this.components, dataModel } };
  }

  update(surfaceId: string, rootChildren: string[]): AgentToRenderer {
    this.components.push({ id: "root", component: "Column", children: rootChildren });
    return { version: A2UI_VERSION, updateComponents: { surfaceId, components: this.components } };
  }
}
