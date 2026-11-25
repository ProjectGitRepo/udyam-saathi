/**
 * Saathi orchestrator. Routes a user message or an A2UI action to a specialist
 * agent (Munim / Vasooli / Yojana) and answers with A2UI 1.0 messages.
 *
 * Intent routing is rule-based for now; an LLM can later replace `routeText`
 * (choose intent + params) without touching the deterministic engines or the
 * UI macros below.
 */
import type { AgentToRenderer, ActionMessage } from "@/a2ui/protocol";
import { SurfaceBuilder } from "./builder";
import type { ActivityItem, Invoice, Lang, Notice, NoticeStage, Workspace } from "@/lib/types";
import { analyseInvoice, fmtInr, receivablesSummary, todayUtc, toIso, addDays, parseDate, type VasooliResult } from "@/lib/vasooli";
import { draftNotice } from "@/lib/notices";
import { SCHEMES, matchSchemes, reasonText } from "@/lib/schemes";
import { alerts, buyerTrust, cashForecast, creditReadiness } from "@/lib/insights";

export type AgentName = "Saathi" | "Munim" | "Vasooli" | "Yojana";

export type AgentInput = { type: "message"; text: string } | { type: "action"; action: ActionMessage["action"] };

export interface AgentOutput {
  agent: AgentName;
  messages: AgentToRenderer[];
  workspace: Workspace;
  /** surface created by this turn (if any) — rendered as a new assistant turn */
  surfaceId?: string;
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const inr = (n: number) => `₹${fmtInr(n)}`;

export function handle(input: AgentInput, ws: Workspace, lang: Lang): AgentOutput {
  const L = (hi: string, en: string) => (lang === "hi" ? hi : en);
  const ctx = { ws, lang, L };
  if (input.type === "action") return handleAction(input.action, ctx);
  return routeText(input.text, ctx);
}

type Ctx = { ws: Workspace; lang: Lang; L: (hi: string, en: string) => string };

// ---------------------------------------------------------------- routing

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
const W = {
  scheme: ["yojana", "scheme", "subsidy", "sarkari", "loan", "योजना", "सब्सिडी", "लोन", "सरकारी", "grant"],
  notice: ["notice", "नोटिस", "reminder", "रिमाइंडर", "samadhaan", "समाधान", "complaint", "शिकायत", "draft", "bhejo", "भेजो", "letter"],
  money: ["paisa", "paise", "payment", "nahi diya", "baki", "baaki", "bakaya", "pending", "overdue", "बकाया", "पैसा", "पैसे", "भुगतान", "owe", "receivable", "udhaar", "उधार", "वसूली", "vasooli", "recover"],
  invoice: ["new invoice", "add invoice", "bill banao", "naya bill", "नया बिल", "बिल जोड़", "add bill", "record sale", "invoice add"],
  paid: ["de diya", "mil gaya", "received", "मिल गया", "दे दिया", "jama", "has paid", "paid me"],
  trust: ["trust", "bharosa", "भरोसा", "risk", "jokhim", "जोखिम", "reliable", "credit du", "udhaar du", "उधार दूं", "safe"],
  cash: ["cash flow", "cashflow", "forecast", "aane wala", "आने वाला", "next month", "agle", "अगले", "kab aayega", "कब आएगा", "inflow"],
  ready: ["loan ready", "credit score", "loan milega", "लोन मिलेगा", "readiness", "bank loan", "loan ke liye", "लोन के लिए", "eligible for loan"],
  today: ["alert", "aaj kya", "आज क्या", "what should i do", "todo", "kya karna", "क्या करना", "aaj ka kaam", "आज का काम", "follow up", "follow-up", "फॉलो"],
};

function findMentioned(text: string, ws: Workspace): Invoice | undefined {
  const t = text.toLowerCase();
  return ws.invoices.filter((i) => i.status === "unpaid").find((i) => t.includes(i.buyer.toLowerCase()) || t.includes(i.buyer.toLowerCase().split(" ")[0]));
}

function routeText(text: string, ctx: Ctx): AgentOutput {
  const t = text.toLowerCase();
  const inv = findMentioned(text, ctx.ws);
  if (has(t, W.invoice)) return invoiceForm(ctx);
  if (has(t, W.today)) return todayAlerts(ctx);
  if (has(t, W.ready)) return readiness(ctx);
  if (has(t, W.trust)) return trust(ctx);
  if (has(t, W.cash)) return forecast(ctx);
  if (inv && has(t, W.paid)) return markPaid(inv.id, ctx);
  if (has(t, W.notice)) {
    const target = inv ?? receivablesSummary(ctx.ws.invoices, ctx.ws.profile).overdue[0];
    if (target) {
      const id = "invoiceId" in target ? target.invoiceId : target.id;
      const stage: NoticeStage = has(t, ["samadhaan", "समाधान", "complaint", "शिकायत"]) ? "samadhaan" : has(t, ["reminder", "रिमाइंडर", "polite"]) ? "reminder" : "legal-notice";
      return createNotice(id, stage, ctx.lang, ctx);
    }
  }
  if (inv) return recovery(inv.id, ctx);
  if (has(t, W.scheme)) return schemeForm(ctx);
  if (has(t, W.money)) return receivables(ctx);
  return help(ctx);
}

function handleAction(a: ActionMessage["action"], ctx: Ctx): AgentOutput {
  const c = a.context as Record<string, unknown>;
  switch (a.name) {
    case "show_receivables":
      return receivables(ctx);
    case "recover_invoice":
      return recovery(String(c.invoiceId), ctx);
    case "draft_notice":
      return createNotice(String(c.invoiceId), c.stage as NoticeStage, (c.lang as Lang) ?? ctx.lang, ctx);
    case "approve_notice":
      return setNoticeStatus(String(c.noticeId), "approved", a.surfaceId, ctx);
    case "mark_sent":
      return setNoticeStatus(String(c.noticeId), "sent", a.surfaceId, ctx);
    case "mark_paid":
      return markPaid(String(c.invoiceId), ctx);
    case "start_schemes":
      return schemeForm(ctx);
    case "submit_scheme_profile":
      return schemeResults(c, ctx);
    case "open_scheme":
      return schemeDetail(String(c.schemeId), ctx);
    case "new_invoice":
      return invoiceForm(ctx);
    case "create_invoice":
      return createInvoice(c, ctx);
    case "show_trust":
      return trust(ctx);
    case "show_forecast":
      return forecast(ctx);
    case "show_readiness":
      return readiness(ctx);
    case "show_alerts":
      return todayAlerts(ctx);
    default:
      return help(ctx);
  }
}

// ---------------------------------------------------------------- helpers

function log(ws: Workspace, kind: ActivityItem["kind"], text: string, textHi?: string): Workspace {
  return { ...ws, activity: [{ id: uid("a"), at: new Date().toISOString(), kind, text, textHi }, ...ws.activity].slice(0, 50) };
}

const STAGE_EN: Record<NoticeStage, string> = { courtesy: "Friendly reminder", reminder: "Polite reminder", "legal-notice": "Legal notice (s.15/16)", samadhaan: "MSME Samadhaan filing" };
const STAGE_HI: Record<NoticeStage, string> = { courtesy: "प्यार भरी याद", reminder: "विनम्र रिमाइंडर", "legal-notice": "कानूनी नोटिस (धारा 15/16)", samadhaan: "MSME समाधान आवेदन" };
const stageLabel = (s: NoticeStage, L: Ctx["L"]) => L(STAGE_HI[s], STAGE_EN[s]);

function stageTone(r: VasooliResult) {
  if (!r.isOverdue) return "ok";
  return r.daysOverdue > 45 ? "danger" : "warn";
}

// ---------------------------------------------------------------- Vasooli

function receivables({ ws, L }: Ctx): AgentOutput {
  const s = receivablesSummary(ws.invoices, ws.profile);
  const b = new SurfaceBuilder();
  const intro = b.text(
    L(
      `**${s.overdueCount} बिल** कानूनी समय-सीमा पार कर चुके हैं — ${inr(s.overdueAmountInr)} बकाया, साथ में ${inr(s.interestClaimableInr)} कानूनी ब्याज का दावा बनता है।`,
      `**${s.overdueCount} invoices** are past the statutory limit — ${inr(s.overdueAmountInr)} outstanding, plus ${inr(s.interestClaimableInr)} interest you can legally claim.`,
    ),
  );
  const table = b.table(
    [
      { key: "buyer", label: L("खरीदार", "Buyer") },
      { key: "amount", label: L("राशि", "Amount"), align: "right", format: "inr" },
      { key: "late", label: L("लेट", "Late"), align: "right", format: "days" },
      { key: "interest", label: L("ब्याज", "Interest"), align: "right", format: "inr" },
    ],
    "/rows",
    { name: "recover_invoice", context: { invoiceId: { "@path": "id" } }, label: L("वसूली", "Recover") },
  );
  const surfaceId = uid("s");
  const rows = s.overdue.map((o) => ({ id: o.invoiceId, buyer: o.buyer, amount: o.amountInr, late: o.daysOverdue, interest: o.interestInr }));
  return { agent: "Vasooli", workspace: ws, surfaceId, messages: [b.create(surfaceId, [intro, table], { rows })] };
}

function recovery(invoiceId: string, { ws, L, lang }: Ctx): AgentOutput {
  const inv = ws.invoices.find((i) => i.id === invoiceId);
  if (!inv) return help({ ws, L, lang });
  const r = analyseInvoice(inv, ws.profile);
  const b = new SurfaceBuilder();
  const kids: string[] = [];

  kids.push(
    b.row([b.text(`### ${r.buyer}`), b.badge(r.isOverdue ? L(`${r.daysOverdue} दिन लेट`, `${r.daysOverdue} days late`) : L("समय पर", "Within terms"), stageTone(r))], "spaceBetween"),
  );
  kids.push(
    b.keyValue([
      { label: L("बिल", "Invoice"), value: `${r.invoiceNumber} · ${r.invoiceDate}` },
      { label: L("मूल राशि", "Principal"), value: inr(r.amountInr) },
      { label: L(`देय तिथि (धारा 15, ${r.creditDaysApplied} दिन)`, `Due date (s.15, ${r.creditDaysApplied} days)`), value: r.dueDate },
      { label: L(`ब्याज (धारा 16 @ ${r.interestRatePct}%)`, `Interest (s.16 @ ${r.interestRatePct}% p.a.)`), value: inr(r.interestInr), tone: r.interestInr ? "warn" : "neutral" },
      { label: L("कुल दावा", "Total claim"), value: inr(r.totalClaimInr), strong: true },
    ]),
  );

  if (!r.eligibility.eligible) {
    kids.push(b.callout(lang === "hi" ? r.eligibility.reasonsHi.join(" ") : r.eligibility.reasons.join(" "), "danger", L("कानूनी उपाय लागू नहीं", "Statutory remedies not available")));
  } else if (!r.isOverdue && inv.status === "unpaid") {
    kids.push(
      b.callout(
        L(`अभी समय है — ${r.daysToDue} दिन बाकी। देय तिथि से पहले एक प्यार भरी याद भेजने से समय पर भुगतान की संभावना बढ़ती है।`, `Still on time — ${r.daysToDue} days left. A friendly nudge before the due date makes on-time payment far more likely.`),
        "info",
        L("लेट होने से पहले रोकें", "Prevent it from going late"),
      ),
      b.row([b.event(L("प्यार भरी याद भेजें", "Send friendly reminder"), "draft_notice", { invoiceId: inv.id, stage: "courtesy" }, "primary")]),
    );
  } else if (r.isOverdue) {
    if (r.buyerTaxRisk) kids.push(b.callout((lang === "hi" ? r.buyerTaxRiskHi : r.buyerTaxRisk) ?? "", "warn", L("खरीदार पर दबाव बिंदु — 43B(h)", "Buyer's pressure point — s.43B(h)")));
    kids.push(
      b.callout(
        L(`TReDS पर यह बिल बेचकर आज लगभग ${inr(r.tredsCashNowInr)} नकद पा सकते हैं (अनुमानित)।`, `Discount this invoice on TReDS to get ~${inr(r.tredsCashNowInr)} in cash now (indicative).`),
        "info",
        L("अभी नकद चाहिए?", "Need cash now?"),
      ),
    );
    const sent = (st: NoticeStage) => ws.notices.some((n) => n.invoiceId === inv.id && n.stage === st && n.status === "sent");
    const order: NoticeStage[] = ["reminder", "legal-notice", "samadhaan"];
    const rec = r.recommendedStage === "none" ? "reminder" : r.recommendedStage;
    kids.push(b.text(L("**वसूली की सीढ़ी**", "**Recovery ladder**")));
    kids.push(
      b.steps(
        order.map((st) => ({
          label: stageLabel(st, L),
          caption: sent(st) ? L("भेजा गया", "Sent") : st === rec ? L("सुझाया गया अगला कदम", "Recommended next step") : undefined,
          status: sent(st) ? "done" : st === rec ? "current" : "todo",
        })),
      ),
    );
    kids.push(
      b.row([
        b.event(L(`ड्राफ्ट: ${stageLabel(rec, L)}`, `Draft ${stageLabel(rec, L).toLowerCase()}`), "draft_notice", { invoiceId: inv.id, stage: rec }, "primary"),
        ...order.filter((s) => s !== rec).map((s) => b.event(stageLabel(s, L), "draft_notice", { invoiceId: inv.id, stage: s })),
        b.event(L("भुगतान मिल गया", "Mark as paid"), "mark_paid", { invoiceId: inv.id }, "borderless"),
      ]),
    );
  }
  const surfaceId = uid("s");
  return { agent: "Vasooli", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

function createNotice(invoiceId: string, stage: NoticeStage, nlang: Lang, ctx: Ctx): AgentOutput {
  const { ws } = ctx;
  const inv = ws.invoices.find((i) => i.id === invoiceId);
  if (!inv) return help(ctx);
  const r = analyseInvoice(inv, ws.profile);
  if (!r.eligibility.eligible && stage !== "reminder" && stage !== "courtesy") return recovery(invoiceId, ctx);
  const notice: Notice = {
    id: uid("n"),
    invoiceId,
    buyer: inv.buyer,
    stage,
    lang: nlang,
    status: "draft",
    text: draftNotice(r, ws.profile, stage, nlang),
    createdAt: new Date().toISOString(),
    claimInr: r.totalClaimInr,
  };
  const next = log({ ...ws, notices: [notice, ...ws.notices] }, "notice", `Drafted ${STAGE_EN[stage].toLowerCase()} for ${inv.buyer}`, `${inv.buyer} के लिए ${STAGE_HI[stage]} तैयार`);
  const surfaceId = uid("s");
  return { agent: "Vasooli", workspace: next, surfaceId, messages: [noticeSurface(notice, surfaceId, ctx, "create")] };
}

function noticeSurface(n: Notice, surfaceId: string, { ws, L }: Ctx, mode: "create" | "update"): AgentToRenderer {
  const b = new SurfaceBuilder(mode === "update" ? `u${Date.now().toString(36)}` : "c");
  const statusTone = n.status === "draft" ? "warn" : n.status === "approved" ? "info" : "ok";
  const statusText = { draft: L("ड्राफ्ट", "Draft"), approved: L("मंज़ूर", "Approved"), sent: L("भेजा गया", "Sent") }[n.status];
  const kids = [
    b.row([b.text(`### ${stageLabel(n.stage, L)} — ${n.buyer}`), b.badge(statusText, statusTone)], "spaceBetween"),
    b.document(n.lang === "hi" ? "हिंदी" : "English", { "@path": "/text" }, L(`दावा ${inr(n.claimInr)}`, `Claim ${inr(n.claimInr)}`)),
  ];
  const inv = ws.invoices.find((i) => i.id === n.invoiceId);
  const phone = inv?.buyerPhone?.replace(/\D/g, "");
  if (n.status === "draft") {
    kids.push(b.text(L("आपकी मंज़ूरी के बिना कुछ नहीं भेजा जाएगा।", "Nothing is sent without your approval."), "caption"));
    kids.push(
      b.row([
        b.event(L("मंज़ूर करें", "Approve"), "approve_notice", { noticeId: n.id }, "primary"),
        b.event(n.lang === "hi" ? "English version" : "हिंदी में", "draft_notice", { invoiceId: n.invoiceId, stage: n.stage, lang: n.lang === "hi" ? "en" : "hi" }),
      ]),
    );
  } else if (n.status === "approved") {
    const send =
      n.stage === "samadhaan"
        ? b.link(L("समाधान पोर्टल खोलें", "Open Samadhaan portal"), "https://samadhaan.msme.gov.in", "primary")
        : b.link(L("WhatsApp पर भेजें", "Send on WhatsApp"), `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(n.text)}`, "primary");
    kids.push(b.row([send, b.event(L("भेजा गया चिह्नित करें", "Mark as sent"), "mark_sent", { noticeId: n.id })]));
  } else {
    kids.push(b.callout(L("Outbox में दर्ज। 7 दिन बाद मैं फॉलो-अप याद दिलाऊंगा।", "Logged in Outbox. I'll remind you to follow up in 7 days."), "ok"));
  }
  if (mode === "create") return b.create(surfaceId, kids, { text: n.text });
  return b.update(surfaceId, kids);
}

function setNoticeStatus(noticeId: string, status: Notice["status"], surfaceId: string, ctx: Ctx): AgentOutput {
  const n = ctx.ws.notices.find((x) => x.id === noticeId);
  if (!n) return help(ctx);
  const updated = { ...n, status };
  let ws = { ...ctx.ws, notices: ctx.ws.notices.map((x) => (x.id === noticeId ? updated : x)) };
  ws = log(
    ws,
    "notice",
    `${status === "sent" ? "Sent" : "Approved"} ${STAGE_EN[n.stage].toLowerCase()} for ${n.buyer}`,
    `${n.buyer} को ${STAGE_HI[n.stage]} ${status === "sent" ? "भेजा गया" : "मंज़ूर"}`,
  );
  return { agent: "Vasooli", workspace: ws, messages: [noticeSurface(updated, surfaceId, { ...ctx, ws }, "update")] };
}

function markPaid(invoiceId: string, ctx: Ctx): AgentOutput {
  const inv = ctx.ws.invoices.find((i) => i.id === invoiceId);
  if (!inv) return help(ctx);
  let ws: Workspace = { ...ctx.ws, invoices: ctx.ws.invoices.map((i) => (i.id === invoiceId ? { ...i, status: "paid" as const, paidDate: toIso(todayUtc()) } : i)) };
  ws = log(ws, "payment", `${inv.buyer} paid ${inr(inv.amountInr)}`, `${inv.buyer} से ${inr(inv.amountInr)} मिले`);
  const b = new SurfaceBuilder();
  const s = receivablesSummary(ws.invoices, ws.profile);
  const surfaceId = uid("s");
  const kids = [
    b.callout(ctx.L(`${inv.buyer} का ${inr(inv.amountInr)} जमा कर दिया गया।`, `Recorded ${inr(inv.amountInr)} received from ${inv.buyer}.`), "ok", ctx.L("भुगतान दर्ज", "Payment recorded")),
    b.text(ctx.L(`अब बाकी: ${inr(s.totalReceivableInr)} (${s.overdueCount} लेट)`, `Still receivable: ${inr(s.totalReceivableInr)} (${s.overdueCount} overdue)`), "caption"),
  ];
  return { agent: "Munim", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

// ---------------------------------------------------------------- Yojana

function schemeForm({ ws, L }: Ctx): AgentOutput {
  const p = ws.profile;
  const b = new SurfaceBuilder();
  const kids = [
    b.text(L("कुछ सवाल — फिर मैं केंद्र और राज्य की योजनाओं से मिलान करूंगा।", "A few quick questions, then I'll match you against central and state schemes.")),
    b.choice(L("बिज़नेस की स्थिति", "Business stage"), "/f/stage", [
      { label: L("चालू बिज़नेस", "Running business"), value: "existing" },
      { label: L("नई यूनिट शुरू करनी है", "Starting a new unit"), value: "new" },
    ]),
    b.textField(L("मालिक की उम्र", "Owner's age"), "/f/age", "number"),
    b.checkBox(L("महिला उद्यमी", "Woman-led enterprise"), "/f/woman"),
    b.checkBox(L("SC/ST उद्यमी", "SC/ST entrepreneur"), "/f/scst"),
    b.checkBox(L("पारंपरिक कारीगर (बढ़ई, कुम्हार, दर्ज़ी…)", "Traditional artisan (carpenter, potter, tailor…)"), "/f/artisan"),
    b.event(L("योग्यता जांचें", "Check eligibility"), "submit_scheme_profile", {
      stage: { "@path": "/f/stage" },
      age: { "@path": "/f/age" },
      woman: { "@path": "/f/woman" },
      scst: { "@path": "/f/scst" },
      artisan: { "@path": "/f/artisan" },
    }, "primary"),
  ];
  const surfaceId = uid("s");
  const f = { stage: [p.isNewEnterprise ? "new" : "existing"], age: p.ownerAge ?? "", woman: !!p.ownerIsWoman, scst: !!p.ownerIsScSt, artisan: !!p.isArtisan };
  return { agent: "Yojana", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids, { f })] };
}

function schemeResults(c: Record<string, unknown>, ctx: Ctx): AgentOutput {
  const { L } = ctx;
  const stage = Array.isArray(c.stage) ? c.stage[0] : c.stage;
  const profile: Workspace["profile"] = {
    ...ctx.ws.profile,
    isNewEnterprise: stage === "new",
    ownerAge: c.age === "" || c.age == null ? undefined : Number(c.age),
    ownerIsWoman: !!c.woman,
    ownerIsScSt: !!c.scst,
    isArtisan: !!c.artisan,
  };
  let ws: Workspace = { ...ctx.ws, profile };
  const m = matchSchemes(profile);
  ws = log(ws, "scheme", `Scheme check: ${m.eligible.length} eligible`, `योजना जांच: ${m.eligible.length} योग्य`);
  const b = new SurfaceBuilder();
  const eligibleTable = b.table(
    [
      { key: "name", label: L("योजना", "Scheme") },
      { key: "level", label: L("स्तर", "Level"), format: "badge" },
    ],
    "/eligible",
    { name: "open_scheme", context: { schemeId: { "@path": "id" } }, label: L("विवरण", "Details") },
  );
  const notTable = b.table(
    [
      { key: "name", label: L("योजना", "Scheme") },
      { key: "reason", label: L("कारण", "Why not") },
    ],
    "/not",
  );
  const kids = [
    b.text(L(`आप **${m.eligible.length} योजनाओं** के योग्य हैं। हर नियम कोड में जांचा गया है, अनुमान नहीं।`, `You qualify for **${m.eligible.length} schemes**. Every rule is checked in code, not guessed.`)),
    b.tabs([
      { title: L(`योग्य (${m.eligible.length})`, `Eligible (${m.eligible.length})`), child: eligibleTable },
      { title: L(`योग्य नहीं (${m.notEligible.length})`, `Not eligible (${m.notEligible.length})`), child: notTable },
    ]),
  ];
  const surfaceId = uid("s");
  const data = {
    eligible: m.eligible.map((s) => ({ id: s.id, name: ctx.lang === "hi" ? s.nameHi : s.name, level: s.level === "central" ? L("केंद्र", "Central") : "MP", tone: s.level === "central" ? "neutral" : "accent" })),
    not: m.notEligible.map((n) => ({ name: ctx.lang === "hi" ? (SCHEMES.find((s) => s.id === n.id)?.nameHi ?? n.name) : n.name, reason: reasonText(n.reason, ctx.lang) })),
  };
  return { agent: "Yojana", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids, data)] };
}

function schemeDetail(id: string, ctx: Ctx): AgentOutput {
  const s = SCHEMES.find((x) => x.id === id);
  if (!s) return help(ctx);
  const { L, lang } = ctx;
  const b = new SurfaceBuilder();
  const kids = [
    b.row([b.text(`### ${lang === "hi" ? s.nameHi : s.name}`), b.badge(s.level === "central" ? L("केंद्र", "Central") : "Madhya Pradesh", "neutral")], "spaceBetween"),
    b.text(lang === "hi" ? s.benefitHi : s.benefit),
    b.text(L("**ज़रूरी कागज़ात**", "**Documents needed**")),
    b.text(s.documents.map((d) => `- ${d}`).join("\n")),
  ];
  if (!s.verified) kids.push(b.callout(L("यह जानकारी अभी आधिकारिक स्रोत से सत्यापित की जा रही है।", "This entry is pending verification against the official source."), "warn"));
  kids.push(b.row([b.link(L("आवेदन करें", "Apply"), s.applyUrl, "primary"), b.link(L("आधिकारिक स्रोत", "Official source"), s.sourceUrl, "borderless")]));
  const surfaceId = uid("s");
  return { agent: "Yojana", workspace: ctx.ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

// ---------------------------------------------------------------- Munim

function invoiceForm({ ws, L }: Ctx): AgentOutput {
  const b = new SurfaceBuilder();
  const kids = [
    b.text(L("नया बिल दर्ज करें — मैं देय तिथि और कानूनी समय-सीमा खुद ट्रैक करूंगा।", "Record a sale — I'll track the due date and statutory limit for you.")),
    b.textField(L("खरीदार", "Buyer"), "/f/buyer", "shortText", "e.g. Sharma Traders"),
    b.row([b.textField(L("राशि (₹)", "Amount (₹)"), "/f/amount", "number"), b.textField(L("उधारी के दिन (लिखित)", "Agreed credit days"), "/f/days", "number")]),
    b.textField(L("बिल की तारीख (YYYY-MM-DD)", "Invoice date (YYYY-MM-DD)"), "/f/date"),
    b.textField(L("सामान", "Items"), "/f/items"),
    b.event(L("बिल जोड़ें", "Add invoice"), "create_invoice", { buyer: { "@path": "/f/buyer" }, amount: { "@path": "/f/amount" }, days: { "@path": "/f/days" }, date: { "@path": "/f/date" }, items: { "@path": "/f/items" } }, "primary"),
  ];
  const surfaceId = uid("s");
  return { agent: "Munim", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids, { f: { buyer: "", amount: "", days: 30, date: toIso(todayUtc()), items: "" } })] };
}

function createInvoice(c: Record<string, unknown>, ctx: Ctx): AgentOutput {
  const { L } = ctx;
  const amount = Number(c.amount);
  const buyer = String(c.buyer ?? "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(c.date)) ? String(c.date) : toIso(todayUtc());
  const b = new SurfaceBuilder();
  if (!buyer || !(amount > 0)) {
    const surfaceId = uid("s");
    return { agent: "Munim", workspace: ctx.ws, surfaceId, messages: [b.create(surfaceId, [b.callout(L("खरीदार और राशि ज़रूरी हैं।", "Buyer and amount are required."), "danger")])] };
  }
  const inv: Invoice = {
    id: uid("inv"),
    buyer,
    amountInr: amount,
    agreedCreditDays: Number(c.days) > 0 ? Number(c.days) : undefined,
    invoiceDate: date,
    invoiceNumber: `SGN/${date.slice(0, 4)}/${140 + ctx.ws.invoices.length}`,
    items: String(c.items ?? "") || undefined,
    status: "unpaid",
  };
  let ws = { ...ctx.ws, invoices: [inv, ...ctx.ws.invoices] };
  ws = log(ws, "invoice", `Invoice ${inv.invoiceNumber} raised to ${buyer}`, `${buyer} को बिल ${inv.invoiceNumber} बनाया`);
  const r = analyseInvoice(inv, ws.profile);
  const capped = inv.agreedCreditDays && inv.agreedCreditDays > 45;
  const kids = [
    b.callout(L(`${buyer} — ${inr(amount)} दर्ज।`, `${buyer} — ${inr(amount)} recorded.`), "ok", L("बिल जोड़ा गया", "Invoice added")),
    b.keyValue([
      { label: L("बिल नंबर", "Invoice no."), value: inv.invoiceNumber },
      { label: L("कानूनी देय तिथि", "Statutory due date"), value: r.dueDate, strong: true },
      { label: L("याद दिलाऊंगा", "Reminder on"), value: toIso(addDays(parseDate(r.dueDate), -3)) },
    ]),
  ];
  if (capped) kids.push(b.callout(L("लिखित समझौते में 45 दिन से ज़्यादा उधारी हो तो भी कानून 45 दिन ही मानता है।", "Credit beyond 45 days isn't valid under s.15 — the law caps it at 45 days."), "info"));
  const surfaceId = uid("s");
  return { agent: "Munim", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

// ---------------------------------------------------------------- Insights

function trust({ ws, L, lang }: Ctx): AgentOutput {
  const rows = buyerTrust(ws);
  const b = new SurfaceBuilder();
  const risky = rows.filter((r) => r.grade === "C" || r.grade === "D");
  const tone = { A: "ok", B: "info", C: "warn", D: "danger" } as const;
  const table = b.table(
    [
      { key: "buyer", label: L("खरीदार", "Buyer") },
      { key: "grade", label: L("भरोसा", "Trust"), format: "badge" },
      { key: "late", label: L("औसत देरी", "Avg late"), align: "right" },
      { key: "advice", label: L("सलाह", "Advice") },
    ],
    "/rows",
  );
  const kids = [
    b.text(
      L(
        `पिछले भुगतान के आधार पर हर खरीदार का भरोसा स्कोर। **${risky.length} खरीदार** जोखिम वाले हैं — नए ऑर्डर पर सावधान रहें।`,
        `Trust score for every buyer, from their actual payment history. **${risky.length} buyers** are risky — be careful with new orders.`,
      ),
    ),
    table,
  ];
  const surfaceId = uid("s");
  const data = {
    rows: rows.map((r) => ({ buyer: r.buyer, grade: `${r.grade} · ${r.score}`, tone: tone[r.grade], late: r.avgDaysLate ? `${r.avgDaysLate}d` : "—", advice: lang === "hi" ? r.advice.hi : r.advice.en })),
  };
  return { agent: "Vasooli", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids, data)] };
}

function forecast({ ws, L }: Ctx): AgentOutput {
  const f = cashForecast(ws);
  const b = new SurfaceBuilder();
  const kids = [
    b.row([b.metric(L("अगले 30 दिन में आने की उम्मीद", "Likely in next 30 days"), inr(f.next30Expected), "ok"), b.metric(L("लेट-पेयर्स पर निर्भर", "Depends on late payers"), inr(f.next30AtRisk), "warn")], "spaceBetween", "start"),
    b.table(
      [
        { key: "label", label: L("हफ़्ता", "Week") },
        { key: "expected", label: L("पक्का-सा", "Likely"), align: "right", format: "inr" },
        { key: "risk", label: L("जोखिम में", "At risk"), align: "right", format: "inr" },
      ],
      "/weeks",
    ),
  ];
  if (f.next30AtRisk > 0)
    kids.push(
      b.callout(
        L("जोखिम वाले बिल TReDS पर बेचकर अभी नकद ले सकते हैं, या वसूली नोटिस भेजें।", "Turn at-risk invoices into cash now via TReDS, or start recovery notices."),
        "info",
        L("नकदी की कमी से बचें", "Avoid a cash crunch"),
      ),
      b.row([b.event(L("वसूली शुरू करें", "Start recovery"), "show_receivables", {}, "primary")]),
    );
  const surfaceId = uid("s");
  const weeks = f.weeks.map((w, i) => ({ label: `${i === 0 ? L("इस हफ़्ते", "This week") : L(`+${i} हफ़्ते`, `+${i} wk`)} · ${w.start.slice(5)}`, expected: w.expectedInr, risk: w.atRiskInr }));
  return { agent: "Munim", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids, { weeks })] };
}

function readiness({ ws, L, lang }: Ctx): AgentOutput {
  const r = creditReadiness(ws);
  const b = new SurfaceBuilder();
  const bandText = { strong: L("मज़बूत", "Strong"), fair: L("ठीक-ठाक", "Fair"), weak: L("कमज़ोर", "Needs work") }[r.band as "strong" | "fair" | "weak"];
  const kids = [
    b.row([b.metric(L("लोन तैयारी स्कोर", "Loan readiness"), `${r.score}/100`, r.band === "strong" ? "ok" : r.band === "fair" ? "warn" : "danger"), b.badge(bandText, r.band === "strong" ? "ok" : "warn")], "spaceBetween"),
    b.keyValue(r.factors.map((f) => ({ label: lang === "hi" ? f.hi : f.en, value: `${f.points}/${f.max}`, tone: f.points === f.max ? "ok" : f.points === 0 ? "danger" : "warn" }))),
  ];
  const tips = r.factors.filter((f) => f.points < f.max).map((f) => `- ${lang === "hi" ? f.tipHi : f.tipEn}`);
  if (tips.length) kids.push(b.text(L("**स्कोर बढ़ाने के लिए**", "**To improve your score**")), b.text(tips.join("\n")));
  kids.push(b.text(L("यह बैंक/ब्यूरो स्कोर नहीं, आपके रिकॉर्ड पर आधारित तैयारी का अनुमान है।", "Not a bureau score — a readiness estimate from your own records."), "caption"));
  kids.push(b.row([b.event(L("लोन योजनाएं देखें", "See loan schemes"), "start_schemes", {}, "primary")]));
  const surfaceId = uid("s");
  return { agent: "Yojana", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

function todayAlerts({ ws, L, lang }: Ctx): AgentOutput {
  const list = alerts(ws);
  const b = new SurfaceBuilder();
  const kids = [
    b.text(
      list.length
        ? L(`आज के लिए **${list.length} ज़रूरी बातें** — पैसा अटकने से पहले रोकिए।`, `**${list.length} things to act on today** — stop money getting stuck before it happens.`)
        : L("आज कुछ ज़रूरी नहीं। बढ़िया!", "Nothing needs your attention today. Great!"),
    ),
  ];
  for (const a of list) {
    const t = lang === "hi" ? a.hi : a.en;
    kids.push(b.callout(t.body, a.tone, t.title));
    if (a.action) kids.push(b.row([b.event(lang === "hi" ? a.action.hi : a.action.en, a.action.name, a.action.context, a.kind === "follow-up" || a.kind === "due-soon" ? "primary" : "default")]));
  }
  const surfaceId = uid("s");
  return { agent: "Saathi", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}

// ---------------------------------------------------------------- Saathi

function help({ ws, L }: Ctx): AgentOutput {
  const b = new SurfaceBuilder();
  const name = ws.profile.owner.split(" ")[0];
  const kids = [
    b.text(L(`नमस्ते ${name} जी। मैं आपके बिज़नेस का हिसाब, वसूली और सरकारी योजनाएं संभालता हूँ।`, `Namaste ${name} ji. I handle your books, payment recovery and government schemes.`)),
    b.row([
      b.event(L("आज क्या करना है?", "What should I do today?"), "show_alerts", {}, "primary"),
      b.event(L("किसका पैसा बाकी है?", "Who owes me money?"), "show_receivables"),
      b.event(L("मेरे लिए योजनाएं", "Schemes for me"), "start_schemes"),
      b.event(L("नया बिल", "New invoice"), "new_invoice"),
      b.event(L("किस पर भरोसा करूं?", "Which buyers can I trust?"), "show_trust"),
      b.event(L("अगले 30 दिन का कैश", "Cash in next 30 days"), "show_forecast"),
      b.event(L("क्या लोन मिलेगा?", "Am I loan-ready?"), "show_readiness"),
    ]),
  ];
  const surfaceId = uid("s");
  return { agent: "Saathi", workspace: ws, surfaceId, messages: [b.create(surfaceId, kids)] };
}
