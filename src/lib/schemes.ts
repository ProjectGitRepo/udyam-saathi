/**
 * Yojana — curated scheme knowledge base + deterministic eligibility rules.
 *
 * IMPORTANT: every entry is `verified: false` until a teammate checks it against
 * the official source URL. Benefit amounts change often — never ship unverified
 * numbers in the final pitch. The LLM only explains schemes returned by
 * `matchSchemes`; it never invents schemes.
 */
import type { BusinessProfile } from "./types";
import { classifyEnterprise } from "./vasooli";

export interface Scheme {
  id: string;
  name: string;
  nameHi: string;
  level: "central" | "madhya-pradesh" | "karnataka";
  category: "registration" | "credit" | "subsidy" | "market" | "rights" | "quality";
  benefit: string;
  benefitHi: string;
  documents: string[];
  applyUrl: string;
  sourceUrl: string;
  verified: boolean;
  /** returns null if eligible, or a reason string if not */
  rule: (p: BusinessProfile) => string | null;
}

const isMSE = (p: BusinessProfile) => {
  const e = classifyEnterprise(p.investmentInr, p.turnoverInr);
  return e === "micro" || e === "small";
};

export const SCHEMES: Scheme[] = [
  {
    id: "udyam",
    name: "Udyam Registration",
    nameHi: "उद्यम पंजीकरण",
    level: "central",
    category: "registration",
    benefit: "Free MSME registration. Unlocks MSMED Act delayed-payment protection, priority-sector lending and most schemes below.",
    benefitHi: "मुफ्त MSME पंजीकरण। देरी से भुगतान पर कानूनी सुरक्षा और ज़्यादातर योजनाओं का रास्ता खुलता है।",
    documents: ["Aadhaar of owner", "PAN", "GSTIN (if applicable)", "Bank account"],
    applyUrl: "https://udyamregistration.gov.in",
    sourceUrl: "https://udyamregistration.gov.in",
    verified: false,
    rule: (p) => (p.udyamRegistered ? "Already registered" : null),
  },
  {
    id: "samadhaan",
    name: "MSME Samadhaan (Delayed Payment Complaint)",
    nameHi: "MSME समाधान (देरी से भुगतान शिकायत)",
    level: "central",
    category: "rights",
    benefit: "File a case with the MSE Facilitation Council against buyers who pay late; claim principal plus statutory interest.",
    benefitHi: "देरी से भुगतान करने वाले खरीदार के खिलाफ शिकायत दर्ज करें; मूल राशि + कानूनी ब्याज का दावा।",
    documents: ["Udyam certificate", "Invoices", "Delivery/acceptance proof", "Buyer details"],
    applyUrl: "https://samadhaan.msme.gov.in",
    sourceUrl: "https://samadhaan.msme.gov.in",
    verified: false,
    rule: (p) =>
      !p.udyamRegistered ? "Needs Udyam registration" : p.sector === "trading" ? "Not available to traders" : !isMSE(p) ? "Only micro & small" : null,
  },
  {
    id: "treds",
    name: "TReDS Invoice Discounting",
    nameHi: "TReDS बिल डिस्काउंटिंग",
    level: "central",
    category: "credit",
    benefit: "Sell unpaid invoices raised on large buyers to financiers on an RBI-regulated platform and get cash in ~48 hours, without collateral.",
    benefitHi: "बड़े खरीदारों पर बने बकाया बिल बेचकर लगभग 48 घंटे में नकद पाएं, बिना गारंटी के।",
    documents: ["Udyam certificate", "PAN", "GSTIN", "Bank statements", "KYC of directors/owner"],
    applyUrl: "https://www.rbi.org.in",
    sourceUrl: "https://www.rbi.org.in",
    verified: false,
    rule: (p) => (!p.udyamRegistered ? "Needs Udyam registration" : null),
  },
  {
    id: "cgtmse",
    name: "CGTMSE — Collateral-free Credit Guarantee",
    nameHi: "CGTMSE — बिना गारंटी लोन",
    level: "central",
    category: "credit",
    benefit: "Bank loans for micro & small enterprises without collateral or third-party guarantee; the guarantee is provided by the trust.",
    benefitHi: "माइक्रो और स्मॉल उद्यमों के लिए बिना गिरवी/गारंटर के बैंक लोन।",
    documents: ["Udyam certificate", "Project report / business plan", "KYC", "Bank statements (6–12 months)", "ITR"],
    applyUrl: "https://www.cgtmse.in",
    sourceUrl: "https://www.cgtmse.in",
    verified: false,
    rule: (p) => (!isMSE(p) ? "Only micro & small" : null),
  },
  {
    id: "mudra",
    name: "PM MUDRA Yojana",
    nameHi: "प्रधानमंत्री मुद्रा योजना",
    level: "central",
    category: "credit",
    benefit: "Collateral-free loans for micro enterprises in tiers (Shishu, Kishore, Tarun, Tarun Plus).",
    benefitHi: "सूक्ष्म उद्यमों के लिए बिना गिरवी के लोन (शिशु, किशोर, तरुण, तरुण प्लस)।",
    documents: ["KYC", "Business proof", "Quotation of machinery/items", "Bank statements"],
    applyUrl: "https://www.mudra.org.in",
    sourceUrl: "https://www.mudra.org.in",
    verified: false,
    rule: (p) => (classifyEnterprise(p.investmentInr, p.turnoverInr) !== "micro" ? "Only micro enterprises" : null),
  },
  {
    id: "pmegp",
    name: "PMEGP — Employment Generation Programme",
    nameHi: "PMEGP — रोज़गार सृजन कार्यक्रम",
    level: "central",
    category: "subsidy",
    benefit: "Margin-money subsidy on bank loans to set up NEW manufacturing or service units; higher subsidy for women, SC/ST and rural applicants.",
    benefitHi: "नई यूनिट लगाने के लिए बैंक लोन पर सब्सिडी; महिलाओं, SC/ST और ग्रामीण आवेदकों को ज़्यादा।",
    documents: ["Aadhaar", "Project report", "Education certificate (for larger projects)", "Caste/category certificate if applicable"],
    applyUrl: "https://www.kviconline.gov.in/pmegpeportal",
    sourceUrl: "https://www.kviconline.gov.in/pmegpeportal",
    verified: false,
    rule: (p) =>
      !p.isNewEnterprise ? "Only for new units" : p.sector === "trading" ? "Not for trading" : p.ownerAge !== undefined && p.ownerAge < 18 ? "Applicant must be 18+" : null,
  },
  {
    id: "standup",
    name: "Stand-Up India",
    nameHi: "स्टैंड-अप इंडिया",
    level: "central",
    category: "credit",
    benefit: "Bank loans for greenfield enterprises led by women or SC/ST entrepreneurs.",
    benefitHi: "महिला या SC/ST उद्यमियों के नए उद्यमों के लिए बैंक लोन।",
    documents: ["KYC", "Category certificate (SC/ST) if applicable", "Project report"],
    applyUrl: "https://www.standupmitra.in",
    sourceUrl: "https://www.standupmitra.in",
    verified: false,
    rule: (p) =>
      !p.isNewEnterprise ? "Only for greenfield units" : !(p.ownerIsWoman || p.ownerIsScSt) ? "Only women / SC-ST entrepreneurs" : null,
  },
  {
    id: "vishwakarma",
    name: "PM Vishwakarma",
    nameHi: "पीएम विश्वकर्मा",
    level: "central",
    category: "subsidy",
    benefit: "Recognition, skilling, toolkit support and concessional credit for traditional artisans and craftspeople.",
    benefitHi: "पारंपरिक कारीगरों के लिए पहचान, प्रशिक्षण, टूलकिट सहायता और सस्ता लोन।",
    documents: ["Aadhaar", "Bank account", "Ration card"],
    applyUrl: "https://pmvishwakarma.gov.in",
    sourceUrl: "https://pmvishwakarma.gov.in",
    verified: false,
    rule: (p) => (!p.isArtisan ? "Only for traditional artisans" : null),
  },
  {
    id: "zed",
    name: "MSME ZED Certification",
    nameHi: "MSME ZED प्रमाणन",
    level: "central",
    category: "quality",
    benefit: "Quality certification with most of the cost subsidised for micro units; helps win larger buyers and tenders.",
    benefitHi: "गुणवत्ता प्रमाणन, सूक्ष्म इकाइयों के लिए ज़्यादातर खर्च सरकार देती है; बड़े खरीदार और टेंडर पाने में मदद।",
    documents: ["Udyam certificate"],
    applyUrl: "https://zed.msme.gov.in",
    sourceUrl: "https://zed.msme.gov.in",
    verified: false,
    rule: (p) => (!p.udyamRegistered ? "Needs Udyam registration" : p.sector !== "manufacturing" ? "Manufacturing units" : null),
  },
  {
    id: "gem",
    name: "GeM Seller Registration",
    nameHi: "GeM विक्रेता पंजीकरण",
    level: "central",
    category: "market",
    benefit: "Sell directly to government departments; MSEs get purchase preference and relaxations in tenders.",
    benefitHi: "सरकारी विभागों को सीधे बेचें; MSE को टेंडर में प्राथमिकता और छूट।",
    documents: ["Udyam certificate", "PAN", "GSTIN", "Bank account"],
    applyUrl: "https://gem.gov.in",
    sourceUrl: "https://gem.gov.in",
    verified: false,
    rule: () => null,
  },
  {
    id: "mp-udyam-kranti",
    name: "Mukhyamantri Udyam Kranti Yojana (MP)",
    nameHi: "मुख्यमंत्री उद्यम क्रांति योजना (म.प्र.)",
    level: "madhya-pradesh",
    category: "credit",
    benefit: "Interest subvention and guarantee-fee support on loans for young entrepreneurs of Madhya Pradesh starting manufacturing, service or business units.",
    benefitHi: "म.प्र. के युवा उद्यमियों को उद्योग/सेवा/व्यवसाय के लोन पर ब्याज अनुदान और गारंटी शुल्क सहायता।",
    documents: ["MP domicile certificate", "Aadhaar", "Education certificate", "Project report"],
    applyUrl: "https://samast.mponline.gov.in",
    sourceUrl: "https://msme.mp.gov.in",
    verified: false,
    rule: (p) =>
      p.state !== "Madhya Pradesh"
        ? "Only for MP"
        : p.ownerAge !== undefined && (p.ownerAge < 18 || p.ownerAge > 40)
          ? "Age 18–40 only"
          : null,
  },
  {
    id: "mp-msme-policy",
    name: "MP MSME Development Policy — Capital Subsidy",
    nameHi: "म.प्र. MSME विकास नीति — पूंजी अनुदान",
    level: "madhya-pradesh",
    category: "subsidy",
    benefit: "Investment/capital assistance for MSMEs setting up or expanding manufacturing in Madhya Pradesh, with extra support for women and SC/ST entrepreneurs.",
    benefitHi: "म.प्र. में उत्पादन इकाई लगाने/बढ़ाने पर पूंजी सहायता; महिलाओं और SC/ST को अतिरिक्त लाभ।",
    documents: ["Udyam certificate", "Project report", "Land/lease documents", "Machinery invoices"],
    applyUrl: "https://msme.mp.gov.in",
    sourceUrl: "https://msme.mp.gov.in",
    verified: false,
    rule: (p) => (p.state !== "Madhya Pradesh" ? "Only for MP" : p.sector !== "manufacturing" ? "Manufacturing units" : null),
  },
];

const REASON_HI: Record<string, string> = {
  "Already registered": "पहले से पंजीकृत",
  "Needs Udyam registration": "उद्यम पंजीकरण ज़रूरी",
  "Not available to traders": "व्यापारियों के लिए नहीं",
  "Only micro & small": "सिर्फ़ सूक्ष्म और लघु उद्यम",
  "Only micro enterprises": "सिर्फ़ सूक्ष्म उद्यम",
  "Only for new units": "सिर्फ़ नई यूनिट के लिए",
  "Not for trading": "व्यापार के लिए नहीं",
  "Applicant must be 18+": "आवेदक 18+ होना चाहिए",
  "Only for greenfield units": "सिर्फ़ नई यूनिट के लिए",
  "Only women / SC-ST entrepreneurs": "सिर्फ़ महिला / SC-ST उद्यमी",
  "Only for traditional artisans": "सिर्फ़ पारंपरिक कारीगर",
  "Manufacturing units": "सिर्फ़ उत्पादन इकाइयां",
  "Only for MP": "सिर्फ़ मध्य प्रदेश",
  "Age 18–40 only": "उम्र 18–40 ही",
};

export const reasonText = (reason: string, lang: "hi" | "en") => (lang === "hi" ? (REASON_HI[reason] ?? reason) : reason);

export interface SchemeMatch {
  id: string;
  name: string;
  nameHi: string;
  level: Scheme["level"];
  category: Scheme["category"];
  benefit: string;
  benefitHi: string;
  documents: string[];
  applyUrl: string;
  sourceUrl: string;
  verified: boolean;
}

export function matchSchemes(p: BusinessProfile): { eligible: SchemeMatch[]; notEligible: { id: string; name: string; reason: string }[] } {
  const eligible: SchemeMatch[] = [];
  const notEligible: { id: string; name: string; reason: string }[] = [];
  for (const s of SCHEMES) {
    const reason = s.rule(p);
    if (reason) notEligible.push({ id: s.id, name: s.name, reason });
    else {
      const { rule: _rule, ...rest } = s;
      void _rule;
      eligible.push(rest);
    }
  }
  return { eligible, notEligible };
}
