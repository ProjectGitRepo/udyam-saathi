"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Card, PageHeader, type PageProps } from "../App";
import { AVATAR } from "./Today";
import { Badge } from "@/ui/primitives";
import { CountUp, spring, stagger } from "@/ui/motion";
import { ForecastBars } from "@/ui/viz";
import { financialYearEnd, fmtInr, parseDate, todayUtc } from "@/lib/vasooli";
import { cashForecast } from "@/lib/insights";

const inr = (n: number) => `₹${fmtInr(n)}`;

export function Munim({ api, L }: PageProps) {
  const ws = api.workspace;
  const f = cashForecast(ws);
  const fyEnd = financialYearEnd(todayUtc());
  const fyStart = new Date(Date.UTC(fyEnd.getUTCFullYear() - 1, 3, 1));
  const fy = ws.invoices.filter((i) => parseDate(i.invoiceDate) >= fyStart);
  const sales = fy.reduce((a, i) => a + i.amountInr, 0);
  const withTerms = ws.invoices.filter((i) => i.agreedCreditDays);
  const avgCredit = withTerms.length ? Math.round(withTerms.reduce((a, i) => a + (i.agreedCreditDays ?? 0), 0) / withTerms.length) : 0;
  const sorted = [...ws.invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  const buyers = [...new Set(ws.invoices.map((i) => i.buyer))];

  return (
    <div>
      <PageHeader
        eyebrow={L("मुनीम एजेंट", "Munim Agent")}
        title={L("आपका हिसाब, साफ़-सुथरा", "Your books, sorted")}
        description={L("हर बिल, हर भुगतान — और आगे कितना पैसा आने वाला है।", "Every invoice, every payment — and how much money is coming next.")}
        actions={
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={() => api.trigger("new_invoice")} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(29,90,72,0.7)]">
            <Plus className="h-5 w-5" /> {L("नया बिल", "New invoice")}
          </motion.button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-info">{L("कैश अनुमान · 6 हफ़्ते", "Cash forecast · 6 weeks")}</p>
          <p className="mt-1 max-w-md text-[14px] text-ink-2">{L("हर खरीदार की आदत के हिसाब से — कौन कब देता है।", "Adjusted for each buyer's habits — who actually pays when.")}</p>
          <div className="mt-6">
            <ForecastBars height={190} weeks={f.weeks.map((w, i) => ({ ...w, label: i === 0 ? L("इस हफ़्ते", "This wk") : L(`+${i} हफ़्ते`, `+${i} wk`) }))} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-accent-soft p-3.5">
              <p className="text-[12px] text-accent">{L("30 दिन में पक्का-सा", "Likely in 30 days")}</p>
              <p className="font-display text-[30px] leading-none text-accent"><CountUp value={f.next30Expected} /></p>
            </div>
            <div className="rounded-2xl bg-saffron-soft p-3.5">
              <p className="text-[12px] text-saffron">{L("लेट-पेयर्स पर टिका", "Depends on late payers")}</p>
              <p className="font-display text-[30px] leading-none text-saffron"><CountUp value={f.next30AtRisk} /></p>
            </div>
          </div>
          {f.next30AtRisk > 0 && (
            <button onClick={() => api.trigger("show_forecast")} className="mt-4 text-[13.5px] font-medium text-accent hover:underline">
              {L("नकदी की कमी से कैसे बचें? साथी से पूछें →", "How to avoid a cash crunch? Ask Saathi →")}
            </button>
          )}
        </Card>
        <div className="grid gap-4">
          {[
            { k: L("इस वित्त वर्ष की बिक्री", "Sales this FY"), v: <CountUp value={sales} />, sub: L(`${fy.length} बिल`, `${fy.length} invoices`) },
            { k: L("औसत उधारी", "Avg. credit given"), v: <><CountUp value={avgCredit} prefix="" /> {L("दिन", "days")}</>, sub: L("कानूनी सीमा 45 दिन", "Legal cap: 45 days") },
            { k: L("खरीदार", "Buyers"), v: <CountUp value={buyers.length} prefix="" />, sub: buyers.slice(0, 3).join(", ") },
          ].map((m, i) => (
            <motion.div key={m.k} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08, ...spring }} className="h-full">
              <Card className="flex h-full flex-col justify-center !py-4">
                <p className="text-[12.5px] text-muted">{m.k}</p>
                <p className="font-display text-[34px] leading-tight">{m.v}</p>
                <p className="truncate text-[12.5px] text-muted">{m.sub}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      <h2 className="mb-3 mt-10 font-display text-[34px] leading-none">{L("बही-खाता", "Ledger")}</h2>
      <motion.ul variants={stagger.container} initial="hidden" animate="show" className="space-y-2">
        {sorted.map((i) => (
          <motion.li key={i.id} variants={stagger.item} whileHover={{ x: 4 }} transition={spring} className="flex items-center gap-4 rounded-[20px] border border-black/[0.06] bg-white/80 px-4 py-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${AVATAR[buyers.indexOf(i.buyer) % AVATAR.length]}`}>{i.buyer[0]}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold">{i.buyer}</p>
              <p className="truncate text-[12.5px] text-muted">
                {i.invoiceDate} · {i.invoiceNumber} · {i.items ?? "—"}
              </p>
            </div>
            <span className="hidden text-[12.5px] text-muted md:block">{i.agreedCreditDays ? `${i.agreedCreditDays} ${L("दिन उधारी", "days credit")}` : L("लिखित उधारी नहीं", "no written terms")}</span>
            {i.status === "paid" ? <Badge tone="ok" dot>{L("मिल गया", "Paid")}</Badge> : <Badge dot>{L("बकाया", "Unpaid")}</Badge>}
            <p className="w-28 text-right font-display text-[22px] leading-none">{inr(i.amountInr)}</p>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}
