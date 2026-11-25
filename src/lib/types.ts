export type Sector = "manufacturing" | "services" | "trading";

export interface BusinessProfile {
  name: string;
  owner: string;
  city: string;
  state: string;
  sector: Sector;
  activity: string;
  employees: number;
  investmentInr: number; // plant & machinery / equipment
  turnoverInr: number; // annual
  udyamRegistered: boolean;
  udyamNumber?: string;
  gstin?: string;
  ownerAge?: number;
  ownerIsWoman?: boolean;
  ownerIsScSt?: boolean;
  isNewEnterprise?: boolean;
  isArtisan?: boolean;
}

export type InvoiceStatus = "unpaid" | "paid";

export interface Invoice {
  id: string;
  buyer: string;
  buyerGstin?: string;
  buyerPhone?: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO yyyy-mm-dd — treated as date of acceptance
  amountInr: number;
  agreedCreditDays?: number;
  status: InvoiceStatus;
  paidDate?: string;
  items?: string;
}

/** courtesy = friendly nudge BEFORE the due date (prevents late payment) */
export type NoticeStage = "courtesy" | "reminder" | "legal-notice" | "samadhaan";
export type NoticeStatus = "draft" | "approved" | "sent";

export interface Notice {
  id: string;
  invoiceId: string;
  buyer: string;
  stage: NoticeStage;
  lang: Lang;
  status: NoticeStatus;
  text: string;
  createdAt: string; // ISO datetime
  claimInr: number;
}

export interface ActivityItem {
  id: string;
  at: string; // ISO datetime
  kind: "invoice" | "payment" | "notice" | "scheme" | "profile";
  text: string;
  textHi?: string;
}

/** Whole client-side workspace; source of truth lives in the browser for the prototype. */
export interface Workspace {
  profile: BusinessProfile;
  invoices: Invoice[];
  notices: Notice[];
  activity: ActivityItem[];
}

export type Lang = "hi" | "en";
