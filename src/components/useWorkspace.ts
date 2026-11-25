"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang, Workspace } from "@/lib/types";
import { buildDemoWorkspace } from "@/lib/demo-data";
import { applyMessages, type ActionMessage, type AgentToRenderer, type Surfaces } from "@/a2ui/protocol";
import type { AgentInput, AgentName } from "@/agent/agent";

export type Turn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; agent: AgentName; surfaceId: string };

interface Persisted {
  workspace: Workspace;
  lang: Lang;
  turns: Turn[];
  surfaces: Surfaces;
}

const KEY = "udyam-saathi:v4";

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

const STAGE_LABEL: Record<string, [string, string]> = {
  courtesy: ["Friendly reminder", "प्यार भरी याद"],
  reminder: ["Polite reminder", "विनम्र रिमाइंडर"],
  "legal-notice": ["Legal notice", "कानूनी नोटिस"],
  samadhaan: ["Samadhaan filing", "समाधान आवेदन"],
};

type Labeler = (c: Record<string, unknown>, ws: Workspace, hi: boolean) => string;
const buyerOf = (c: Record<string, unknown>, ws: Workspace) => ws.invoices.find((i) => i.id === c.invoiceId)?.buyer ?? "";
const ACTION_LABELS: Record<string, Labeler> = {
  show_receivables: (_c, _w, hi) => (hi ? "बकाया सूची दिखाओ" : "Show overdue payments"),
  recover_invoice: (c, ws, hi) => `${hi ? "वसूली" : "Recover"} · ${buyerOf(c, ws)}`,
  draft_notice: (c, ws, hi) => `${STAGE_LABEL[String(c.stage)]?.[hi ? 1 : 0] ?? c.stage} · ${buyerOf(c, ws)}`,
  approve_notice: (_c, _w, hi) => (hi ? "मंज़ूर" : "Approve"),
  mark_sent: (_c, _w, hi) => (hi ? "भेजा गया" : "Mark as sent"),
  mark_paid: (c, ws, hi) => `${hi ? "पैसा मिला" : "Mark paid"} · ${buyerOf(c, ws)}`,
  start_schemes: (_c, _w, hi) => (hi ? "योजनाओं की योग्यता जांचें" : "Check scheme eligibility"),
  submit_scheme_profile: (_c, _w, hi) => (hi ? "योग्यता जांचें" : "Check eligibility"),
  open_scheme: (c, _w, hi) => `${hi ? "योजना विवरण" : "Scheme details"} · ${c.schemeId}`,
  new_invoice: (_c, _w, hi) => (hi ? "नया बिल" : "New invoice"),
  create_invoice: (c, _w, hi) => `${hi ? "बिल जोड़ें" : "Add invoice"} · ${c.buyer}`,
  show_trust: (_c, _w, hi) => (hi ? "किस पर भरोसा करूं?" : "Which buyers can I trust?"),
  show_forecast: (_c, _w, hi) => (hi ? "अगले 30 दिन का कैश" : "Cash in the next 30 days"),
  show_readiness: (_c, _w, hi) => (hi ? "क्या लोन मिलेगा?" : "Am I loan-ready?"),
  show_alerts: (_c, _w, hi) => (hi ? "आज क्या करना है?" : "What should I do today?"),
};

/** Actions that update an existing surface in place rather than creating a new turn */
const IN_PLACE = new Set(["approve_notice", "mark_sent"]);

export function useWorkspace() {
  const [initial] = useState(load);
  const [workspace, setWorkspace] = useState<Workspace>(() => initial?.workspace ?? buildDemoWorkspace());
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("lang");
      if (q === "hi" || q === "en") return q;
      const shared = localStorage.getItem("udyam-saathi:lang");
      if (shared === "hi" || shared === "en") return shared;
    } catch {
      /* ignore */
    }
    return initial?.lang ?? "hi";
  });
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("udyam-saathi:lang", l);
    } catch {
      /* ignore */
    }
  }, []);
  const [turns, setTurns] = useState<Turn[]>(() => initial?.turns ?? []);
  const [surfaces, setSurfaces] = useState<Surfaces>(() => initial?.surfaces ?? {});
  const [busy, setBusy] = useState(false);
  const wsRef = useRef(workspace);
  const langRef = useRef(lang);

  useEffect(() => {
    wsRef.current = workspace;
    langRef.current = lang;
    try {
      localStorage.setItem(KEY, JSON.stringify({ workspace, lang, turns, surfaces } satisfies Persisted));
    } catch {
      /* storage unavailable */
    }
  }, [workspace, lang, turns, surfaces]);

  const run = useCallback(async (input: AgentInput) => {
    const ws = wsRef.current;
    if (input.type === "message") setTurns((t) => [...t, { id: `u${Date.now()}`, role: "user", text: input.text }]);
    else if (!IN_PLACE.has(input.action.name)) {
      const label = input.action.userMessage ?? ACTION_LABELS[input.action.name]?.(input.action.context, ws, langRef.current === "hi") ?? input.action.name;
      setTurns((t) => [...t, { id: `u${Date.now()}`, role: "user", text: label }]);
    }
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, workspace: ws, lang: langRef.current }),
      });
      const out = (await res.json()) as { agent: AgentName; messages: AgentToRenderer[]; workspace: Workspace; surfaceId?: string };
      setWorkspace(out.workspace);
      wsRef.current = out.workspace;
      setSurfaces((s) => applyMessages(s, out.messages));
      if (out.surfaceId) setTurns((t) => [...t, { id: `a${Date.now()}`, role: "assistant", agent: out.agent, surfaceId: out.surfaceId! }]);
    } finally {
      setBusy(false);
    }
  }, []);

  const send = useCallback((text: string) => run({ type: "message", text }), [run]);
  const act = useCallback((action: ActionMessage["action"]) => run({ type: "action", action }), [run]);
  /** Trigger an agent action from regular app UI (not from a surface) */
  const trigger = useCallback(
    (name: string, context: Record<string, unknown> = {}) =>
      run({ type: "action", action: { name, context, surfaceId: "app", sourceComponentId: "app", timestamp: new Date().toISOString() } }),
    [run],
  );

  const setData = useCallback((surfaceId: string, path: string, value: unknown) => {
    setSurfaces((s) => applyMessages(s, [{ version: "1.0", updateDataModel: { surfaceId, path, value } }]));
  }, []);

  const reset = useCallback(() => {
    setWorkspace(buildDemoWorkspace());
    setTurns([]);
    setSurfaces({});
  }, []);

  return { workspace, setWorkspace, lang, setLang, turns, surfaces, busy, send, act, trigger, setData, reset };
}

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
