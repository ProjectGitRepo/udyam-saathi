"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search, Scale, CheckCircle2 } from "lucide-react";
import { Card, PageHeader, type PageProps } from "../App";
import { AVATAR } from "./Today";
import { Badge, Callout, KeyValue, Steps } from "@/ui/primitives";
import { CountUp, spring, stagger } from "@/ui/motion";
import { ScoreRing, gradeColor } from "@/ui/viz";
import { analyseInvoice, fmtInr, receivablesSummary } from "@/lib/vasooli";
import { buyerTrust } from "@/lib/insights";
import type { NoticeStage } from "@/lib/types";

const inr = (n: number) => `₹${fmtInr(n)}`;
type Filter = "overdue" | "terms" | "paid";

export function Vasooli({ api, L }: PageProps) {
  const ws = api.workspace;
  const hi = api.lang === "hi";
  const [filter, setFilter] = useState<Filter>("overdue");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const s = receivablesSummary(ws.invoices, ws.profile);
  const trust = buyerTrust(ws);

  const rows = useMemo(
    () =>
      ws.invoices
        .map((i) => ({ inv: i, r: analyseInvoice(i, ws.profile) }))
        .sort((a, b) => (b.inv.status === "unpaid" ? 1 : 0) - (a.inv.status === "unpaid" ? 1 : 0) || b.r.daysOverdue - a.r.daysOverdue || b.inv.invoiceDate.localeCompare(a.inv.invoiceDate)),
    [ws.invoices, ws.profile],
  );
  const match = (x: (typeof rows)[number], f: Filter) => (f === "overdue" ? x.inv.status === "unpaid" && x.r.isOverdue : f === "terms" ? x.inv.status === "unpaid" && !x.r.isOverdue : x.inv.status === "paid");
  const visible = rows.filter((x) => match(x, filter) && (!q || x.inv.buyer.toLowerCase().includes(q.toLowerCase())));
  const selected = rows.find((x) => x.inv.id === sel) ?? visible[0] ?? null;
  const stageName: Record<NoticeStage | "none", string> = { courtesy: L("प्यार भरी याद", "Friendly reminder"), reminder: L("रिमाइंडर", "Reminder"), "legal-notice": L("कानूनी नोटिस", "Legal notice"), samadhaan: L("समाधान शिकायत", "Samadhaan filing"), none: "—" };
  const tabs: { id: Filter; label: string }[] = [
    { id: "overdue", label: L("लेट", "Overdue") },
    { id: "terms", label: L("समय पर", "On time") },
    { id: "paid", label: L("मिल गया", "Paid") },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={L("वसूली एजेंट", "Vasooli Agent")}
        title={L("अपना पैसा वापस लाइए", "Get your money back")}
        description={L("कानून (MSMED धारा 15–16) के हिसाब से हर बिल की देय तिथि और ब्याज — और कौन सा कदम उठाना है।", "Every invoice's legal due date and interest under the MSMED Act (s.15–16) — and the exact next step.")}
        actions={
          <div className="flex gap-6 rounded-[22px] border border-black/[0.07] bg-white px-5 py-3">
            <div>
              <p className="text-[12px] text-muted">{L("लेट बकाया", "Overdue")}</p>
              <p className="font-display text-[28px] leading-none text-danger"><CountUp value={s.overdueAmountInr} /></p>
            </div>
            <div>
              <p className="text-[12px] text-muted">{L("ब्याज का दावा", "Interest claim")}</p>
              <p className="font-display text-[28px] leading-none text-saffron"><CountUp value={s.interestClaimableInr} /></p>
            </div>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-black/10 bg-white/70 p-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setFilter(t.id); setSel(null); }} className="relative rounded-full px-4 py-1.5 text-[13.5px] font-medium">
              {filter === t.id && <motion.span layoutId="vas-filter" transition={spring} className="absolute inset-0 rounded-full bg-ink" />}
              <span className={`relative ${filter === t.id ? "text-white" : "text-ink-2"}`}>
                {t.label} <span className="opacity-60">{rows.filter((x) => match(x, t.id)).length}</span>
              </span>
            </button>
          ))}
        </div>
        <label className="flex h-10 items-center gap-2 rounded-full border border-black/10 bg-white px-4">
          <Search className="h-4 w-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("खरीदार खोजें", "Search buyer")} className="w-40 bg-transparent text-[13.5px] outline-none" />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <motion.ul layout className="space-y-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map(({ inv, r }, idx) => {
              const active = selected?.inv.id === inv.id;
              return (
                <motion.li
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring}
                  whileHover={{ x: 4 }}
                  onClick={() => setSel(inv.id)}
                  className={`relative flex cursor-pointer items-center gap-4 rounded-[22px] border p-4 transition-colors ${active ? "border-accent/40 bg-white shadow-[0_12px_30px_-20px_rgba(29,90,72,0.6)]" : "border-black/[0.06] bg-white/70 hover:bg-white"}`}
                >
                  {active && <motion.span layoutId="vas-active" transition={spring} className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-accent" />}
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold ${AVATAR[idx % AVATAR.length]}`}>{inv.buyer[0]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{inv.buyer}</p>
                    <p className="text-[12.5px] text-muted">
                      {inv.invoiceNumber} · {L("देय", "due")} {r.dueDate}
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    {inv.status === "paid" ? (
                      <Badge tone="ok" dot>{L("मिल गया", "Paid")}</Badge>
                    ) : r.isOverdue ? (
                      <Badge tone={r.daysOverdue > 45 ? "danger" : "warn"} dot>{L(`${r.daysOverdue} दिन लेट`, `${r.daysOverdue}d late`)}</Badge>
                    ) : (
                      <Badge dot>{L("समय पर", "On time")}</Badge>
                    )}
                  </div>
                  <p className="w-28 text-right font-display text-[24px] leading-none">{inr(inv.amountInr)}</p>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {visible.length === 0 && <p className="rounded-[22px] border border-dashed border-black/10 p-8 text-center text-muted">{L("यहाँ कुछ नहीं।", "Nothing here.")}</p>}
        </motion.ul>

        <div className="lg:sticky lg:top-2 lg:self-start">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.inv.id} initial={{ opacity: 0, x: 20, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -10 }} transition={spring}>
                <Card>
                  <p className="text-[12.5px] text-muted">{selected.inv.invoiceNumber}</p>
                  <p className="font-display text-[30px] leading-tight">{selected.inv.buyer}</p>
                  <p className="mt-3 text-[12.5px] text-muted">{L("कुल दावा", "Total claim")}</p>
                  <p className="font-display text-[46px] leading-none">
                    <CountUp value={selected.inv.status === "paid" ? selected.inv.amountInr : selected.r.totalClaimInr} duration={0.6} />
                  </p>
                  {selected.inv.status === "unpaid" ? (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger("recover_invoice", { invoiceId: selected.inv.id })} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-[14.5px] font-semibold text-white">
                        <Scale className="h-4 w-4" /> {L("वसूली करें", "Recover")}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger("mark_paid", { invoiceId: selected.inv.id })} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 text-[14.5px] font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> {L("पैसा मिला", "Got paid")}
                      </motion.button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[13.5px] text-ok">{L(`${selected.inv.paidDate} को भुगतान मिला।`, `Paid on ${selected.inv.paidDate}.`)}</p>
                  )}
                  <div className="mt-4">
                    <KeyValue
                      items={[
                        { label: L("मूल राशि", "Principal"), value: inr(selected.inv.amountInr) },
                        { label: L("उधारी (लागू)", "Credit applied"), value: `${selected.r.creditDaysApplied} ${L("दिन", "days")}` },
                        { label: L("देय तिथि", "Due date"), value: selected.r.dueDate },
                        { label: `${L("ब्याज", "Interest")} @ ${selected.r.interestRatePct}%`, value: inr(selected.inv.status === "paid" ? 0 : selected.r.interestInr), tone: "warn" },
                      ]}
                    />
                  </div>
                  {selected.inv.status === "unpaid" && selected.r.isOverdue && selected.r.eligibility.eligible && (
                    <div className="mt-4 space-y-4">
                      <Steps
                        items={(["reminder", "legal-notice", "samadhaan"] as const).map((st) => {
                          const sent = ws.notices.some((n) => n.invoiceId === selected.inv.id && n.stage === st && n.status === "sent");
                          return { label: stageName[st], status: sent ? "done" : st === selected.r.recommendedStage ? "current" : "todo" };
                        })}
                      />
                      {selected.r.buyerTaxRisk && <Callout tone="warn" title={L("खरीदार पर दबाव — 43B(h)", "Buyer's pressure point — 43B(h)")}>{hi ? selected.r.buyerTaxRiskHi : selected.r.buyerTaxRisk}</Callout>}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-[34px] leading-none">{L("खरीदार भरोसा स्कोर", "Buyer trust scores")}</h2>
        <p className="mt-2 max-w-2xl text-[14.5px] text-ink-2">
          {L("हर खरीदार के असली भुगतान इतिहास से बना स्कोर। नया ऑर्डर लेने से पहले देखें।", "Built from each buyer's real payment history. Check before you accept a new order on credit.")}
        </p>
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {trust.map((t) => (
            <motion.div key={t.buyer} variants={stagger.item} whileHover={{ y: -5 }} transition={spring}>
              <Card className="h-full">
                <div className="flex items-center gap-4">
                  <ScoreRing value={t.score} size={76} stroke={7} color={gradeColor[t.grade]} />
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-semibold">{t.buyer}</p>
                    <p className="mt-0.5 text-[13px] font-semibold" style={{ color: gradeColor[t.grade] }}>
                      {L("ग्रेड", "Grade")} {t.grade}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-canvas py-2">
                    <p className="font-display text-[22px] leading-none text-ok">{t.paidOnTime}</p>
                    <p className="mt-1 text-[11px] text-muted">{L("समय पर", "On time")}</p>
                  </div>
                  <div className="rounded-xl bg-canvas py-2">
                    <p className="font-display text-[22px] leading-none text-saffron">{t.paidLate}</p>
                    <p className="mt-1 text-[11px] text-muted">{L("लेट", "Late")}</p>
                  </div>
                  <div className="rounded-xl bg-canvas py-2">
                    <p className="font-display text-[22px] leading-none">{t.avgDaysLate}d</p>
                    <p className="mt-1 text-[11px] text-muted">{L("औसत देरी", "Avg delay")}</p>
                  </div>
                </div>
                <p className="mt-3 rounded-xl px-3 py-2 text-[13px] font-medium" style={{ background: `${gradeColor[t.grade]}14`, color: gradeColor[t.grade] }}>
                  {hi ? t.advice.hi : t.advice.en}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
