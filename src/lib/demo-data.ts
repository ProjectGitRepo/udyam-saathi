import type { BusinessProfile, Invoice, Workspace } from "./types";
import { addDays, analyseInvoice, toIso, todayUtc } from "./vasooli";
import { draftNotice } from "./notices";

/** Fictional demo business. Dates are relative to today so the demo never goes stale. */
export function buildDemoWorkspace(asOf = todayUtc()): Workspace {
  const ago = (d: number) => toIso(addDays(asOf, -d));
  const at = (d: number, h = 11) => new Date(addDays(asOf, -d).getTime() + h * 3_600_000).toISOString();
  const profile: BusinessProfile = {
    name: "Shree Ganesh Namkeen",
    owner: "Ramesh Patidar",
    city: "Indore",
    state: "Madhya Pradesh",
    sector: "manufacturing",
    activity: "Namkeen & snacks manufacturing",
    employees: 8,
    investmentInr: 3_500_000,
    turnoverInr: 12_000_000,
    udyamRegistered: true,
    udyamNumber: "UDYAM-MP-23-0000000",
    gstin: "23ABCDE1234F1Z5",
    ownerAge: 34,
    ownerIsWoman: false,
    ownerIsScSt: false,
    isNewEnterprise: false,
    isArtisan: false,
  };
  const invoices: Invoice[] = [
    { id: "inv-1", buyer: "Sharma Traders", invoiceNumber: "SGN/2026/118", invoiceDate: ago(60), amountInr: 240_000, agreedCreditDays: 30, status: "unpaid", items: "Ratlami sev 400 kg, Mixture 200 kg", buyerPhone: "+91 98260 00000" },
    { id: "inv-2", buyer: "Malwa Retail Pvt Ltd", invoiceNumber: "SGN/2026/104", invoiceDate: ago(78), amountInr: 185_000, agreedCreditDays: 45, status: "unpaid", items: "Assorted namkeen, 1,200 packs" },
    { id: "inv-3", buyer: "Indore Caterers", invoiceNumber: "SGN/2026/087", invoiceDate: ago(96), amountInr: 38_500, status: "unpaid", items: "Bulk sev for wedding order" },
    { id: "inv-4", buyer: "Annapurna Sweets", invoiceNumber: "SGN/2026/131", invoiceDate: ago(25), amountInr: 62_000, agreedCreditDays: 30, status: "unpaid", items: "Khatta meetha 300 kg" },
    { id: "inv-6", buyer: "Vijay Nagar Supermart", invoiceNumber: "SGN/2026/136", invoiceDate: ago(9), amountInr: 47_800, agreedCreditDays: 21, status: "unpaid", items: "Retail packs, 640 units" },
    { id: "inv-5", buyer: "Rajwada Foods", invoiceNumber: "SGN/2026/095", invoiceDate: ago(50), amountInr: 91_000, agreedCreditDays: 30, status: "paid", paidDate: ago(22), items: "Bhujia 350 kg" },
    { id: "inv-7", buyer: "Sarafa Snacks Co.", invoiceNumber: "SGN/2026/079", invoiceDate: ago(110), amountInr: 56_200, agreedCreditDays: 30, status: "paid", paidDate: ago(70), items: "Sev & papdi 220 kg" },
    // payment history (drives buyer trust scores)
    { id: "h-1", buyer: "Sharma Traders", invoiceNumber: "SGN/2026/061", invoiceDate: ago(150), amountInr: 168_000, agreedCreditDays: 30, status: "paid", paidDate: ago(95), items: "Ratlami sev 300 kg" },
    { id: "h-2", buyer: "Sharma Traders", invoiceNumber: "SGN/2026/072", invoiceDate: ago(120), amountInr: 205_000, agreedCreditDays: 30, status: "paid", paidDate: ago(50), items: "Mixture 450 kg" },
    { id: "h-3", buyer: "Malwa Retail Pvt Ltd", invoiceNumber: "SGN/2026/058", invoiceDate: ago(140), amountInr: 142_000, agreedCreditDays: 45, status: "paid", paidDate: ago(85), items: "Assorted packs" },
    { id: "h-4", buyer: "Annapurna Sweets", invoiceNumber: "SGN/2026/083", invoiceDate: ago(90), amountInr: 58_000, agreedCreditDays: 30, status: "paid", paidDate: ago(62), items: "Khatta meetha 280 kg" },
    { id: "h-5", buyer: "Annapurna Sweets", invoiceNumber: "SGN/2026/101", invoiceDate: ago(55), amountInr: 61_500, agreedCreditDays: 30, status: "paid", paidDate: ago(27), items: "Khatta meetha 300 kg" },
    { id: "h-6", buyer: "Vijay Nagar Supermart", invoiceNumber: "SGN/2026/109", invoiceDate: ago(40), amountInr: 44_300, agreedCreditDays: 21, status: "paid", paidDate: ago(20), items: "Retail packs" },
    { id: "h-7", buyer: "Indore Caterers", invoiceNumber: "SGN/2026/052", invoiceDate: ago(160), amountInr: 29_000, status: "paid", paidDate: ago(85), items: "Wedding order" },
  ];

  // A polite reminder already sent to Malwa Retail 9 days ago → drives the "follow up" alert.
  const malwa = invoices[1];
  const sentOn = addDays(asOf, -9);
  const r = analyseInvoice(malwa, profile, sentOn);

  return {
    profile,
    invoices,
    notices: [
      { id: "n-demo-1", invoiceId: malwa.id, buyer: malwa.buyer, stage: "reminder", lang: "hi", status: "sent", text: draftNotice(r, profile, "reminder", "hi"), createdAt: at(9, 10), claimInr: r.totalClaimInr },
    ],
    activity: [
      { id: "a-0", at: at(9, 10), kind: "notice", text: "Sent polite reminder to Malwa Retail Pvt Ltd", textHi: "Malwa Retail Pvt Ltd को विनम्र रिमाइंडर भेजा" },
      { id: "a-1", at: at(9), kind: "invoice", text: "Invoice SGN/2026/136 raised to Vijay Nagar Supermart", textHi: "Vijay Nagar Supermart को बिल SGN/2026/136 बनाया" },
      { id: "a-3", at: at(22), kind: "payment", text: "Rajwada Foods paid ₹91,000", textHi: "Rajwada Foods से ₹91,000 मिले" },
      { id: "a-2", at: at(25), kind: "invoice", text: "Invoice SGN/2026/131 raised to Annapurna Sweets", textHi: "Annapurna Sweets को बिल SGN/2026/131 बनाया" },
    ],
  };
}
