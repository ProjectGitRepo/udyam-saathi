/**
 * Vetted notice templates. Legal wording is fixed text filled with numbers from
 * the deterministic engine — the LLM never writes legal claims itself.
 * Templates must be reviewed by a lawyer/CA before real-world use.
 */
import type { BusinessProfile, Lang, NoticeStage } from "./types";
import { fmtInr, type VasooliResult } from "./vasooli";

export function draftNotice(r: VasooliResult, p: BusinessProfile, stage: NoticeStage, lang: Lang = "en"): string {
  if (lang === "hi") return hindi(r, p, stage);
  return english(r, p, stage);
}

function english(r: VasooliResult, p: BusinessProfile, stage: NoticeStage): string {
  const amt = `₹${fmtInr(r.amountInr)}`;
  if (stage === "courtesy") {
    return [
      `Namaste ${r.buyer} ji,`,
      ``,
      `A friendly note that invoice ${r.invoiceNumber} for ${amt} is due on ${r.dueDate}${r.daysToDue > 0 ? ` (in ${r.daysToDue} days)` : ""}.`,
      ``,
      `Thank you for your continued business — timely payment helps us keep serving you with the same prices and priority.`,
      ``,
      `${p.owner}, ${p.name}`,
    ].join("\n");
  }
  if (stage === "reminder") {
    return [
      `Namaste ${r.buyer} ji,`,
      ``,
      `A gentle reminder that invoice ${r.invoiceNumber} dated ${r.invoiceDate} for ${amt} was due on ${r.dueDate} and is now ${r.daysOverdue} days overdue.`,
      ``,
      `We value our relationship and request you to clear the payment at the earliest. As a Udyam-registered micro/small enterprise, delayed payments attract statutory interest under the MSMED Act, 2006 — we would like to avoid that for both of us.`,
      ``,
      `Thank you,`,
      `${p.owner}, ${p.name}`,
    ].join("\n");
  }
  if (stage === "legal-notice") {
    return [
      `To: ${r.buyer}`,
      `Subject: Notice for delayed payment under Sections 15 & 16 of the MSMED Act, 2006`,
      ``,
      `We, ${p.name} (${p.udyamNumber ?? "Udyam-registered"}), supplied goods/services against invoice ${r.invoiceNumber} dated ${r.invoiceDate} for ${amt}. Under Section 15, payment was due on or before ${r.dueDate}. As of today it is ${r.daysOverdue} days overdue.`,
      ``,
      `Under Section 16, you are liable to pay compound interest with monthly rests at three times the RBI bank rate (${r.interestRatePct}% p.a.). Interest accrued to date: ₹${fmtInr(r.interestInr)}. Total payable: ₹${fmtInr(r.totalClaimInr)}.`,
      ``,
      `Please also note that under Section 43B(h) of the Income Tax Act, this expense is deductible in your books only in the year it is actually paid.`,
      ``,
      `Kindly pay within 7 days, failing which we will refer the matter to the MSE Facilitation Council under Section 18 via the MSME Samadhaan portal.`,
      ``,
      `${p.owner}`,
      `${p.name}, ${p.city}`,
    ].join("\n");
  }
  return [
    `MSME SAMADHAAN — APPLICATION DRAFT (Section 18, MSMED Act 2006)`,
    ``,
    `Supplier: ${p.name}, ${p.city}, ${p.state}`,
    `Udyam No.: ${p.udyamNumber ?? "—"}`,
    `Buyer: ${r.buyer}`,
    `Invoice: ${r.invoiceNumber} dated ${r.invoiceDate}`,
    `Principal outstanding: ₹${fmtInr(r.amountInr)}`,
    `Due date (s.15): ${r.dueDate}  |  Days delayed: ${r.daysOverdue}`,
    `Interest claimed (s.16 @ ${r.interestRatePct}% p.a., monthly compounding): ₹${fmtInr(r.interestInr)}`,
    `Total claim: ₹${fmtInr(r.totalClaimInr)}`,
    ``,
    `Attach: Udyam certificate, invoice copy, delivery/acceptance proof (e-way bill / LR / signed challan), reminder & notice sent.`,
    `File at: https://samadhaan.msme.gov.in`,
  ].join("\n");
}

function hindi(r: VasooliResult, p: BusinessProfile, stage: NoticeStage): string {
  const amt = `₹${fmtInr(r.amountInr)}`;
  if (stage === "courtesy") {
    return [
      `नमस्ते ${r.buyer} जी,`,
      ``,
      `एक छोटी सी याद — बिल ${r.invoiceNumber} की राशि ${amt} की देय तिथि ${r.dueDate} है${r.daysToDue > 0 ? ` (${r.daysToDue} दिन बाकी)` : ""}।`,
      ``,
      `आपके साथ व्यापार के लिए धन्यवाद — समय पर भुगतान से हम आपको इसी दाम और प्राथमिकता से सेवा देते रहेंगे।`,
      ``,
      `${p.owner}, ${p.name}`,
    ].join("\n");
  }
  if (stage === "reminder") {
    return [
      `नमस्ते ${r.buyer} जी,`,
      ``,
      `विनम्र याद दिलाना है कि बिल ${r.invoiceNumber} (दिनांक ${r.invoiceDate}) की राशि ${amt} का भुगतान ${r.dueDate} तक होना था, जो अब ${r.daysOverdue} दिन से बकाया है।`,
      ``,
      `कृपया जल्द से जल्द भुगतान करें। हम उद्यम-पंजीकृत सूक्ष्म/लघु उद्यम हैं — MSMED अधिनियम 2006 के तहत देरी पर कानूनी ब्याज लगता है, जिससे हम दोनों बचना चाहेंगे।`,
      ``,
      `धन्यवाद,`,
      `${p.owner}, ${p.name}`,
    ].join("\n");
  }
  if (stage === "legal-notice") {
    return [
      `प्रति: ${r.buyer}`,
      `विषय: MSMED अधिनियम 2006 की धारा 15 व 16 के तहत भुगतान में देरी का नोटिस`,
      ``,
      `हमने (${p.name}, ${p.udyamNumber ?? "उद्यम-पंजीकृत"}) बिल ${r.invoiceNumber} दिनांक ${r.invoiceDate}, राशि ${amt} के तहत माल/सेवा दी। धारा 15 के अनुसार भुगतान ${r.dueDate} तक देय था; आज ${r.daysOverdue} दिन की देरी हो चुकी है।`,
      ``,
      `धारा 16 के तहत आप RBI बैंक दर के तीन गुना (${r.interestRatePct}% वार्षिक), मासिक चक्रवृद्धि ब्याज के देनदार हैं। अब तक ब्याज: ₹${fmtInr(r.interestInr)}। कुल देय: ₹${fmtInr(r.totalClaimInr)}।`,
      ``,
      `आयकर अधिनियम की धारा 43B(h) के अनुसार यह खर्च आपकी किताबों में तभी घटाया जा सकेगा जब भुगतान वास्तव में हो जाए।`,
      ``,
      `कृपया 7 दिन में भुगतान करें, अन्यथा हम धारा 18 के तहत MSME समाधान पोर्टल पर MSE सुविधा परिषद में शिकायत दर्ज करेंगे।`,
      ``,
      `${p.owner}`,
      `${p.name}, ${p.city}`,
    ].join("\n");
  }
  return [
    `MSME समाधान — आवेदन ड्राफ्ट (धारा 18, MSMED अधिनियम 2006)`,
    ``,
    `आपूर्तिकर्ता: ${p.name}, ${p.city}, ${p.state}`,
    `उद्यम नं.: ${p.udyamNumber ?? "—"}`,
    `खरीदार: ${r.buyer}`,
    `बिल: ${r.invoiceNumber} दिनांक ${r.invoiceDate}`,
    `बकाया मूल राशि: ₹${fmtInr(r.amountInr)}`,
    `देय तिथि (धारा 15): ${r.dueDate}  |  देरी: ${r.daysOverdue} दिन`,
    `ब्याज दावा (धारा 16 @ ${r.interestRatePct}% वार्षिक): ₹${fmtInr(r.interestInr)}`,
    `कुल दावा: ₹${fmtInr(r.totalClaimInr)}`,
    ``,
    `संलग्न करें: उद्यम प्रमाणपत्र, बिल की कॉपी, डिलीवरी प्रमाण (ई-वे बिल / LR / हस्ताक्षरित चालान), भेजे गए रिमाइंडर व नोटिस।`,
    `दर्ज करें: https://samadhaan.msme.gov.in`,
  ].join("\n");
}
