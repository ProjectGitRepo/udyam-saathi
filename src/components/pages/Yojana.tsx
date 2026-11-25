"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import { Card, PageHeader, type PageProps } from "../App";
import { spring, stagger } from "@/ui/motion";
import { ScoreRing } from "@/ui/viz";
import { SCHEMES, reasonText } from "@/lib/schemes";
import { creditReadiness } from "@/lib/insights";

export function Yojana({ api, L }: PageProps) {
  const ws = api.workspace;
  const hi = api.lang === "hi";
  const ready = creditReadiness(ws);
  const [open, setOpen] = useState<string | null>(null);
  const rows = SCHEMES.map((s) => ({ s, reason: s.rule(ws.profile) })).sort((a, b) => Number(!!a.reason) - Number(!!b.reason));
  const eligible = rows.filter((r) => !r.reason).length;
  const ringColor = ready.band === "strong" ? "#17734a" : ready.band === "fair" ? "#c46a12" : "#b42318";
  const cat: Record<string, string> = { registration: L("पंजीकरण", "Registration"), credit: L("लोन", "Loan"), subsidy: L("सब्सिडी", "Subsidy"), market: L("बाज़ार", "Market"), rights: L("अधिकार", "Rights"), quality: L("गुणवत्ता", "Quality") };

  return (
    <div>
      <PageHeader
        eyebrow={L("योजना एजेंट", "Yojana Agent")}
        title={L("सरकार की मदद, आपके लिए", "Government help, matched to you")}
        description={L("केंद्र और मध्य प्रदेश की योजनाएं — हर नियम कोड में जांचा गया, अनुमान नहीं।", "Central and Madhya Pradesh schemes — every rule checked in code, never guessed.")}
        actions={
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }} onClick={() => api.trigger("start_schemes")} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white">
            {L("4 सवालों में जांचें", "Check in 4 questions")}
          </motion.button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card dark className="relative h-fit overflow-hidden lg:sticky lg:top-2">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/60 blur-3xl" />
          <p className="relative text-[12.5px] font-semibold uppercase tracking-[0.12em] text-[#9be3bd]">{L("लोन तैयारी", "Loan readiness")}</p>
          <div className="relative mt-4 flex items-center gap-6">
            <ScoreRing value={ready.score} size={140} stroke={12} color={ringColor} track="rgba(255,255,255,0.12)" label="/100" />
            <div>
              <p className="font-display text-[34px] leading-tight">{{ strong: L("मज़बूत", "Strong"), fair: L("ठीक-ठाक", "Fair"), weak: L("सुधार चाहिए", "Needs work") }[ready.band as "strong"]}</p>
              <p className="mt-1 text-[13.5px] text-white/65">{L("बैंक लोन के लिए आपके रिकॉर्ड कितने तैयार हैं।", "How ready your records look to a bank.")}</p>
            </div>
          </div>
          <div className="relative mt-6 space-y-3">
            {ready.factors.map((f, i) => (
              <div key={f.key}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-white/80">{hi ? f.hi : f.en}</span>
                  <span className="tabular text-white/60">
                    {f.points}/{f.max}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(f.points / f.max) * 100}%` }} transition={{ delay: 0.3 + i * 0.08, duration: 0.9, ease: [0.16, 1, 0.3, 1] }} className="h-full rounded-full" style={{ background: f.points === f.max ? "#9be3bd" : "#f6c08a" }} />
                </div>
              </div>
            ))}
          </div>
          <p className="relative mt-5 text-[11.5px] text-white/45">{L("बैंक/ब्यूरो स्कोर नहीं — आपके रिकॉर्ड से अनुमान।", "Not a bureau score — an estimate from your own records.")}</p>
        </Card>

        <div>
          <p className="mb-3 text-[14px] text-ink-2">
            <span className="font-display text-[30px] text-accent">{eligible}</span> {L(`में से ${rows.length} योजनाएं आप पर लागू होती हैं`, `of ${rows.length} schemes apply to you`)}
          </p>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-2.5">
            {rows.map(({ s, reason }) => {
              const isOpen = open === s.id;
              return (
                <motion.div key={s.id} variants={stagger.item} layout transition={spring} className={`overflow-hidden rounded-[22px] border ${reason ? "border-black/[0.05] bg-white/50" : "border-black/[0.07] bg-white"}`}>
                  <motion.button layout="position" onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-3 p-4 text-left">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${reason ? "bg-sunken text-faint" : "bg-accent text-white"}`}>{reason ? "–" : <Check className="h-4 w-4" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[15px] font-semibold ${reason ? "text-muted" : ""}`}>{hi ? s.nameHi : s.name}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        {cat[s.category]} · {s.level === "central" ? L("केंद्र", "Central") : "Madhya Pradesh"}
                        {reason ? ` · ${reasonText(reason, api.lang)}` : ""}
                      </p>
                    </div>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={spring}>
                      <ChevronDown className="h-5 w-5 text-faint" />
                    </motion.span>
                  </motion.button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="px-4">
                        <div className="border-t border-line pb-4 pt-3">
                          <p className="text-[14px] leading-relaxed text-ink-2">{hi ? s.benefitHi : s.benefit}</p>
                          <p className="mt-3 text-[12.5px] font-semibold text-ink">{L("ज़रूरी कागज़ात", "Documents needed")}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {s.documents.map((d) => (
                              <span key={d} className="rounded-full bg-sunken px-3 py-1 text-[12.5px]">{d}</span>
                            ))}
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            <a href={s.applyUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-semibold text-white">
                              {L("आवेदन करें", "Apply")} <ArrowUpRight className="h-4 w-4" />
                            </a>
                            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-[13px] text-muted underline">
                              {L("आधिकारिक स्रोत", "Official source")}
                            </a>
                            {!s.verified && <span className="text-[12px] text-warn">{L("सत्यापन बाकी", "Pending verification")}</span>}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
