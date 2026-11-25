/**
 * Vasooli — deterministic delayed-payment engine.
 *
 * Legal basis (VERIFY against bare acts before final submission):
 *  - MSMED Act 2006, s.15: buyer must pay a micro/small supplier on or before the
 *    agreed date; the agreed period can never exceed 45 days from acceptance.
 *    With no written agreement, payment is due by the "appointed day" (15 days).
 *  - MSMED Act 2006, s.16: on delay, buyer owes compound interest with monthly
 *    rests at 3x the bank rate notified by RBI, from the day after the due date.
 *  - MSMED Act 2006, s.18: supplier can refer the dispute to the MSE Facilitation
 *    Council — filed online via the MSME Samadhaan portal.
 *  - Income Tax Act s.43B(h) (from AY 2024-25): a buyer's expense for payments due
 *    to micro/small enterprises beyond the s.15 limit is deductible only in the year
 *    it is actually paid.
 *  - Protections apply to Udyam-registered micro & small MANUFACTURING / SERVICE
 *    suppliers. Traders (retail/wholesale) are NOT covered for delayed payments.
 *
 * All money math lives here, never in the LLM.
 */
import type { BusinessProfile, Invoice } from "./types";

/** RBI Bank Rate (% p.a.). Bank rate = repo + 0.25. VERIFY current value. */
export const RBI_BANK_RATE_PCT = 5.5;
export const STATUTORY_MAX_DAYS = 45;
export const NO_AGREEMENT_DAYS = 15;
/** Indicative TReDS discount rate (% p.a.) — illustrative only. */
export const TREDS_INDICATIVE_RATE_PCT = 10;

const DAY_MS = 86_400_000;

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

export function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

/** Indian financial year end (31 March) for a given date. */
export function financialYearEnd(d: Date): Date {
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  return new Date(Date.UTC(y, 2, 31));
}

export type Enterprise = "micro" | "small" | "medium" | "large";

/** MSME classification — limits revised w.e.f. 1 Apr 2025 (VERIFY). */
export function classifyEnterprise(investmentInr: number, turnoverInr: number): Enterprise {
  const cr = 1e7;
  if (investmentInr <= 2.5 * cr && turnoverInr <= 10 * cr) return "micro";
  if (investmentInr <= 25 * cr && turnoverInr <= 100 * cr) return "small";
  if (investmentInr <= 125 * cr && turnoverInr <= 500 * cr) return "medium";
  return "large";
}

export interface Eligibility {
  eligible: boolean;
  enterprise: Enterprise;
  reasons: string[];
  reasonsHi: string[];
}

export function msmedEligibility(p: BusinessProfile): Eligibility {
  const enterprise = classifyEnterprise(p.investmentInr, p.turnoverInr);
  const reasons: string[] = [];
  const reasonsHi: string[] = [];
  if (!p.udyamRegistered) {
    reasons.push("Business is not Udyam-registered — register first (free) to get MSMED Act protection.");
    reasonsHi.push("बिज़नेस उद्यम-पंजीकृत नहीं है — MSMED कानून की सुरक्षा के लिए पहले (मुफ़्त) पंजीकरण करें।");
  }
  if (enterprise !== "micro" && enterprise !== "small") {
    reasons.push(`Classified as ${enterprise}; delayed-payment protection covers only micro & small suppliers.`);
    reasonsHi.push("देरी से भुगतान की सुरक्षा सिर्फ़ सूक्ष्म और लघु उद्यमों के लिए है।");
  }
  if (p.sector === "trading") {
    reasons.push("Traders are not covered by the MSMED delayed-payment provisions (only manufacturing & services).");
    reasonsHi.push("व्यापारी (ट्रेडर) MSMED देरी-भुगतान नियमों में शामिल नहीं हैं (सिर्फ़ उत्पादन और सेवा)।");
  }
  return { eligible: reasons.length === 0, enterprise, reasons, reasonsHi };
}

export interface VasooliResult {
  invoiceId: string;
  invoiceNumber: string;
  buyer: string;
  amountInr: number;
  invoiceDate: string;
  dueDate: string;
  creditDaysApplied: number;
  daysOutstanding: number;
  daysOverdue: number;
  isOverdue: boolean;
  interestRatePct: number;
  interestInr: number;
  totalClaimInr: number;
  fyEnd: string;
  buyerTaxRisk: string | null; // 43B(h) pressure point
  buyerTaxRiskHi: string | null;
  daysToDue: number; // negative once overdue
  tredsCashNowInr: number; // indicative proceeds if discounted today
  recommendedStage: "none" | "reminder" | "legal-notice" | "samadhaan";
  eligibility: Eligibility;
}

/** Compound interest with monthly rests at 3x bank rate. */
export function msmedInterest(principal: number, daysOverdue: number, bankRatePct = RBI_BANK_RATE_PCT): number {
  if (daysOverdue <= 0) return 0;
  const monthlyRate = (3 * bankRatePct) / 100 / 12;
  const fullMonths = Math.floor(daysOverdue / 30);
  const remDays = daysOverdue - fullMonths * 30;
  const afterMonths = principal * Math.pow(1 + monthlyRate, fullMonths);
  const total = afterMonths * (1 + (monthlyRate * remDays) / 30);
  return Math.round(total - principal);
}

export function analyseInvoice(inv: Invoice, profile: BusinessProfile, asOf: Date = todayUtc()): VasooliResult {
  const eligibility = msmedEligibility(profile);
  const invDate = parseDate(inv.invoiceDate);
  const creditDays = inv.agreedCreditDays
    ? Math.min(inv.agreedCreditDays, STATUTORY_MAX_DAYS)
    : NO_AGREEMENT_DAYS;
  const due = addDays(invDate, creditDays);
  const end = inv.status === "paid" && inv.paidDate ? parseDate(inv.paidDate) : asOf;
  const daysOutstanding = Math.max(0, daysBetween(invDate, end));
  const daysOverdue = Math.max(0, daysBetween(due, end));
  const isOverdue = daysOverdue > 0;
  const rate = 3 * RBI_BANK_RATE_PCT;
  const interestInr = eligibility.eligible ? msmedInterest(inv.amountInr, daysOverdue) : 0;
  const fyEnd = financialYearEnd(asOf);

  let buyerTaxRisk: string | null = null;
  let buyerTaxRiskHi: string | null = null;
  if (isOverdue && eligibility.eligible && inv.status === "unpaid") {
    buyerTaxRisk = `Under Income Tax s.43B(h), ${inv.buyer} cannot deduct this ₹${fmtInr(inv.amountInr)} expense for FY ending ${toIso(fyEnd)} unless it is actually paid by then.`;
    buyerTaxRiskHi = `आयकर धारा 43B(h) के अनुसार, ${inv.buyer} इस ₹${fmtInr(inv.amountInr)} खर्च पर ${toIso(fyEnd)} तक भुगतान किए बिना टैक्स छूट नहीं ले पाएगा।`;
  }

  // Indicative TReDS proceeds: discount for remaining ~30 days at indicative rate.
  const tredsCashNowInr = Math.round(inv.amountInr * (1 - (TREDS_INDICATIVE_RATE_PCT / 100) * (30 / 365)));

  let recommendedStage: VasooliResult["recommendedStage"] = "none";
  if (inv.status === "unpaid" && isOverdue) {
    if (daysOverdue <= 15) recommendedStage = "reminder";
    else if (daysOverdue <= 45) recommendedStage = "legal-notice";
    else recommendedStage = "samadhaan";
  }

  return {
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    buyer: inv.buyer,
    amountInr: inv.amountInr,
    invoiceDate: inv.invoiceDate,
    dueDate: toIso(due),
    creditDaysApplied: creditDays,
    daysOutstanding,
    daysOverdue,
    isOverdue,
    interestRatePct: rate,
    interestInr,
    totalClaimInr: inv.amountInr + interestInr,
    fyEnd: toIso(fyEnd),
    buyerTaxRisk,
    buyerTaxRiskHi,
    daysToDue: daysBetween(asOf, due),
    tredsCashNowInr,
    recommendedStage,
    eligibility,
  };
}

export function receivablesSummary(invoices: Invoice[], profile: BusinessProfile, asOf: Date = todayUtc()) {
  const unpaid = invoices.filter((i) => i.status === "unpaid");
  const analysed = unpaid.map((i) => analyseInvoice(i, profile, asOf));
  const overdue = analysed.filter((a) => a.isOverdue).sort((a, b) => b.totalClaimInr - a.totalClaimInr);
  return {
    totalReceivableInr: unpaid.reduce((s, i) => s + i.amountInr, 0),
    overdueCount: overdue.length,
    overdueAmountInr: overdue.reduce((s, a) => s + a.amountInr, 0),
    interestClaimableInr: overdue.reduce((s, a) => s + a.interestInr, 0),
    overdue,
  };
}

export function fmtInr(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}
