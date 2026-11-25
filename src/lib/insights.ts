/**
 * Value engines built on the ledger — all deterministic.
 *  - buyerTrust: payment-behaviour score per buyer + credit advice
 *  - cashForecast: when money will actually arrive (adjusted for each buyer's habits)
 *  - creditReadiness: how "lender-ready" the business looks, with fixes
 *  - valueDelivered: what Saathi has unlocked so far
 */
import type { Invoice, Workspace } from "./types";
import { addDays, analyseInvoice, daysBetween, parseDate, receivablesSummary, toIso, todayUtc } from "./vasooli";
import { matchSchemes } from "./schemes";

export type Grade = "A" | "B" | "C" | "D";

export interface BuyerTrust {
  buyer: string;
  score: number; // 0–100
  grade: Grade;
  invoices: number;
  paidOnTime: number;
  paidLate: number;
  avgDaysLate: number; // over paid invoices
  outstandingInr: number;
  worstOverdueDays: number;
  advice: { en: string; hi: string };
}

function dueOf(inv: Invoice) {
  const credit = inv.agreedCreditDays ? Math.min(inv.agreedCreditDays, 45) : 15;
  return addDays(parseDate(inv.invoiceDate), credit);
}

export function buyerTrust(ws: Workspace, asOf = todayUtc()): BuyerTrust[] {
  const by = new Map<string, Invoice[]>();
  for (const i of ws.invoices) by.set(i.buyer, [...(by.get(i.buyer) ?? []), i]);
  const out: BuyerTrust[] = [];
  for (const [buyer, invs] of by) {
    const paid = invs.filter((i) => i.status === "paid" && i.paidDate);
    const lateDays = paid.map((i) => Math.max(0, daysBetween(dueOf(i), parseDate(i.paidDate!))));
    const paidLate = lateDays.filter((d) => d > 0).length;
    const avgDaysLate = lateDays.length ? Math.round(lateDays.reduce((a, b) => a + b, 0) / lateDays.length) : 0;
    const unpaid = invs.filter((i) => i.status === "unpaid");
    const worstOverdueDays = Math.max(0, ...unpaid.map((i) => analyseInvoice(i, ws.profile, asOf).daysOverdue));
    const outstandingInr = unpaid.reduce((a, i) => a + i.amountInr, 0);
    // Score: start at 100; penalise habitual lateness, current overdue, and share of late payments.
    let score = 100 - avgDaysLate * 1.1 - worstOverdueDays * 0.7 - (paid.length ? (paidLate / paid.length) * 20 : 0);
    if (paid.length === 0 && unpaid.length > 0) score -= 8; // no track record yet
    score = Math.round(Math.max(5, Math.min(100, score)));
    const grade: Grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";
    const advice = {
      A: { en: "Reliable payer — safe to extend credit.", hi: "भरोसेमंद — उधारी दे सकते हैं।" },
      B: { en: "Usually pays — keep credit at 30 days max.", hi: "आमतौर पर देते हैं — उधारी 30 दिन तक रखें।" },
      C: { en: "Often late — ask for 50% advance on new orders.", hi: "अक्सर लेट — नए ऑर्डर पर 50% एडवांस लें।" },
      D: { en: "High risk — cash/advance only until dues are cleared.", hi: "जोखिम ज़्यादा — बकाया चुकने तक सिर्फ़ नकद/एडवांस।" },
    }[grade];
    out.push({ buyer, score, grade, invoices: invs.length, paidOnTime: paid.length - paidLate, paidLate, avgDaysLate, outstandingInr, worstOverdueDays, advice });
  }
  return out.sort((a, b) => a.score - b.score);
}

export interface ForecastWeek {
  start: string;
  label: string;
  expectedInr: number; // likely to arrive (buyer usually pays)
  atRiskInr: number; // depends on late payers (grade C/D or already overdue)
}

/** 6-week inflow forecast: each unpaid invoice lands on its due date shifted by that buyer's average lateness. */
export function cashForecast(ws: Workspace, weeks = 6, asOf = todayUtc()) {
  const trust = new Map(buyerTrust(ws, asOf).map((t) => [t.buyer, t]));
  const out: ForecastWeek[] = Array.from({ length: weeks }, (_, w) => {
    const start = addDays(asOf, w * 7);
    return { start: toIso(start), label: w === 0 ? "This wk" : `+${w}w`, expectedInr: 0, atRiskInr: 0 };
  });
  let beyond = 0;
  for (const inv of ws.invoices.filter((i) => i.status === "unpaid")) {
    const t = trust.get(inv.buyer);
    const expected = addDays(dueOf(inv), t?.avgDaysLate ?? 0);
    let offset = daysBetween(asOf, expected);
    // Already past the buyer's usual delay: assume it trickles in over roughly half that delay again (min one week).
    if (offset < 0) offset = Math.max(7, Math.round((t?.avgDaysLate || 30) / 2));
    const w = Math.floor(offset / 7);
    const risky = !t || t.grade === "C" || t.grade === "D" || analyseInvoice(inv, ws.profile, asOf).isOverdue;
    if (w >= weeks) {
      beyond += inv.amountInr;
      continue;
    }
    if (risky) out[w].atRiskInr += inv.amountInr;
    else out[w].expectedInr += inv.amountInr;
  }
  const next30Expected = out.slice(0, 4).reduce((a, w) => a + w.expectedInr, 0);
  const next30AtRisk = out.slice(0, 4).reduce((a, w) => a + w.atRiskInr, 0);
  return { weeks: out, beyond, next30Expected, next30AtRisk };
}

export interface ReadinessFactor {
  key: string;
  en: string;
  hi: string;
  points: number;
  max: number;
  tipEn?: string;
  tipHi?: string;
}

/** Lender-readiness (illustrative, not a bureau score). */
export function creditReadiness(ws: Workspace, asOf = todayUtc()) {
  const p = ws.profile;
  const paid = ws.invoices.filter((i) => i.status === "paid" && i.paidDate);
  const onTime = paid.filter((i) => daysBetween(dueOf(i), parseDate(i.paidDate!)) <= 0).length;
  const collection = paid.length ? onTime / paid.length : 0;
  const s = receivablesSummary(ws.invoices, p, asOf);
  const overdueRatio = s.totalReceivableInr ? s.overdueAmountInr / s.totalReceivableInr : 0;
  const factors: ReadinessFactor[] = [
    { key: "udyam", en: "Udyam registration", hi: "उद्यम पंजीकरण", points: p.udyamRegistered ? 20 : 0, max: 20, tipEn: "Register on Udyam (free).", tipHi: "उद्यम पर मुफ़्त पंजीकरण करें।" },
    { key: "gst", en: "GST registration", hi: "GST पंजीकरण", points: p.gstin ? 15 : 0, max: 15, tipEn: "Add your GSTIN.", tipHi: "अपना GSTIN जोड़ें।" },
    { key: "records", en: "Digital sales records", hi: "डिजिटल बिक्री रिकॉर्ड", points: Math.min(15, ws.invoices.length * 2), max: 15, tipEn: "Record every sale in the ledger.", tipHi: "हर बिक्री बही-खाते में दर्ज करें।" },
    { key: "collection", en: "Buyers paying on time", hi: "समय पर भुगतान", points: Math.round(collection * 25), max: 25, tipEn: "Recover overdue dues to improve collection.", tipHi: "बकाया वसूलें, संग्रह सुधरेगा।" },
    { key: "overdue", en: "Low overdue share", hi: "कम बकाया अनुपात", points: Math.round((1 - overdueRatio) * 25), max: 25, tipEn: "Clear the oldest overdue invoices first.", tipHi: "सबसे पुराने बकाया पहले वसूलें।" },
  ];
  const score = factors.reduce((a, f) => a + f.points, 0);
  const band = score >= 75 ? "strong" : score >= 55 ? "fair" : "weak";
  return { score, band, factors };
}

export interface Alert {
  id: string;
  kind: "due-soon" | "follow-up" | "fy-end" | "stop-credit";
  tone: "info" | "warn" | "danger" | "accent";
  en: { title: string; body: string };
  hi: { title: string; body: string };
  action?: { name: string; context: Record<string, unknown>; en: string; hi: string };
}

const NEXT_STAGE = { courtesy: "reminder", reminder: "legal-notice", "legal-notice": "samadhaan", samadhaan: null } as const;

/** Proactive alerts — what the owner should do today, before money gets stuck. */
export function alerts(ws: Workspace, asOf = todayUtc()): Alert[] {
  const out: Alert[] = [];
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  const unpaid = ws.invoices.filter((i) => i.status === "unpaid");

  // 1. Due within 7 days and no courtesy nudge yet → prevent lateness
  for (const inv of unpaid) {
    const r = analyseInvoice(inv, ws.profile, asOf);
    const nudged = ws.notices.some((n) => n.invoiceId === inv.id && n.stage === "courtesy");
    if (!r.isOverdue && r.daysToDue >= 0 && r.daysToDue <= 7 && !nudged)
      out.push({
        id: `due-${inv.id}`,
        kind: "due-soon",
        tone: "info",
        en: { title: `${inv.buyer} — due in ${r.daysToDue} days`, body: `${inr(inv.amountInr)} due on ${r.dueDate}. A friendly nudge now makes on-time payment far more likely.` },
        hi: { title: `${inv.buyer} — ${r.daysToDue} दिन में देय`, body: `${inr(inv.amountInr)} की देय तिथि ${r.dueDate}। अभी एक प्यार भरी याद से समय पर भुगतान की संभावना बढ़ती है।` },
        action: { name: "draft_notice", context: { invoiceId: inv.id, stage: "courtesy" }, en: "Send friendly reminder", hi: "याद दिलाएं" },
      });
  }

  // 2. Notice sent ≥7 days ago, still unpaid → escalate
  const latest = new Map<string, (typeof ws.notices)[number]>();
  for (const n of ws.notices.filter((x) => x.status === "sent")) {
    const cur = latest.get(n.invoiceId);
    if (!cur || n.createdAt > cur.createdAt) latest.set(n.invoiceId, n);
  }
  for (const [invoiceId, n] of latest) {
    const inv = unpaid.find((i) => i.id === invoiceId);
    const next = NEXT_STAGE[n.stage];
    const age = daysBetween(new Date(n.createdAt), asOf);
    if (!inv || !next || age < 7) continue;
    const nextEn = { reminder: "reminder", "legal-notice": "legal notice", samadhaan: "Samadhaan filing" }[next];
    const nextHi = { reminder: "रिमाइंडर", "legal-notice": "कानूनी नोटिस", samadhaan: "समाधान शिकायत" }[next];
    out.push({
      id: `fu-${invoiceId}`,
      kind: "follow-up",
      tone: "warn",
      en: { title: `Follow up: ${inv.buyer}`, body: `${age} days since your ${n.stage.replace("-", " ")} and still unpaid. Time for the ${nextEn}.` },
      hi: { title: `फॉलो-अप: ${inv.buyer}`, body: `नोटिस भेजे ${age} दिन हो गए, भुगतान अब भी नहीं। अब ${nextHi} का समय है।` },
      action: { name: "draft_notice", context: { invoiceId, stage: next }, en: `Draft ${nextEn}`, hi: `${nextHi} बनाएं` },
    });
  }

  // 3. Stop new credit to grade-D buyers who still owe money
  for (const t of buyerTrust(ws, asOf).filter((x) => x.grade === "D" && x.outstandingInr > 0)) {
    out.push({
      id: `stop-${t.buyer}`,
      kind: "stop-credit",
      tone: "danger",
      en: { title: `Pause credit to ${t.buyer}`, body: `Trust score ${t.score}/100 — ${t.avgDaysLate} days late on average and ${inr(t.outstandingInr)} still owed. Take advance or cash on new orders.` },
      hi: { title: `${t.buyer} को उधारी रोकें`, body: `भरोसा स्कोर ${t.score}/100 — औसतन ${t.avgDaysLate} दिन लेट, ${inr(t.outstandingInr)} अब भी बाकी। नए ऑर्डर पर एडवांस या नकद लें।` },
      action: { name: "show_trust", context: {}, en: "See buyer scores", hi: "भरोसा स्कोर देखें" },
    });
  }

  // 4. 43B(h) leverage window before 31 March
  const s = receivablesSummary(ws.invoices, ws.profile, asOf);
  const fyEnd = new Date(Date.UTC(asOf.getUTCMonth() >= 3 ? asOf.getUTCFullYear() + 1 : asOf.getUTCFullYear(), 2, 31));
  const daysLeft = daysBetween(asOf, fyEnd);
  if (s.overdueCount > 0 && daysLeft <= 150)
    out.push({
      id: "fy-end",
      kind: "fy-end",
      tone: "accent",
      en: { title: `${daysLeft} days to 31 March`, body: `${s.overdueCount} buyers lose their tax deduction on ${inr(s.overdueAmountInr)} unless they pay you before year-end (s.43B(h)). Mention it in every follow-up.` },
      hi: { title: `31 मार्च तक ${daysLeft} दिन`, body: `${s.overdueCount} खरीदार ${inr(s.overdueAmountInr)} पर टैक्स छूट खो देंगे अगर साल खत्म होने से पहले भुगतान नहीं किया (धारा 43B(h))। हर फॉलो-अप में यह बताएं।` },
      action: { name: "show_receivables", context: {}, en: "See overdue list", hi: "बकाया सूची देखें" },
    });

  const order = { "follow-up": 0, "due-soon": 1, "stop-credit": 2, "fy-end": 3 };
  return out.sort((a, b) => order[a.kind] - order[b.kind]);
}

export function valueDelivered(ws: Workspace, asOf = todayUtc()) {
  const sentFor = new Set(ws.notices.filter((n) => n.status === "sent").map((n) => n.invoiceId));
  const recovered = ws.invoices.filter((i) => i.status === "paid" && sentFor.has(i.id)).reduce((a, i) => a + i.amountInr, 0);
  const s = receivablesSummary(ws.invoices, ws.profile, asOf);
  const risky = buyerTrust(ws, asOf).filter((t) => t.grade === "C" || t.grade === "D").length;
  return {
    recoveredInr: recovered,
    interestClaimableInr: s.interestClaimableInr,
    unlockableInr: s.overdueAmountInr + s.interestClaimableInr,
    noticesSent: ws.notices.filter((n) => n.status === "sent").length,
    schemesFound: matchSchemes(ws.profile).eligible.length,
    riskyBuyers: risky,
  };
}
