"use client";

import { motion } from "motion/react";
import { ArrowRight, BellRing, CalendarClock, Landmark, Plus, Scale, ShieldAlert, ShieldCheck, TrendingUp } from "lucide-react";
import { Card, type PageProps } from "../App";
import { Badge } from "@/ui/primitives";
import { CountUp, spring, stagger } from "@/ui/motion";
import { ForecastBars, ScoreRing, gradeColor } from "@/ui/viz";
import { fmtInr, receivablesSummary, todayUtc } from "@/lib/vasooli";
import { alerts, buyerTrust, cashForecast, creditReadiness, valueDelivered, type Alert } from "@/lib/insights";

const inr = (n: number) => `₹${fmtInr(n)}`;
const ALERT_STYLE: Record<Alert["kind"], { cls: string; icon: React.ReactNode }> = {
  "follow-up": { cls: "bg-saffron-soft text-saffron", icon: <BellRing className="h-5 w-5" /> },
  "due-soon": { cls: "bg-info-soft text-info", icon: <CalendarClock className="h-5 w-5" /> },
  "stop-credit": { cls: "bg-danger-soft text-danger", icon: <ShieldAlert className="h-5 w-5" /> },
  "fy-end": { cls: "bg-accent-soft text-accent", icon: <Landmark className="h-5 w-5" /> },
};
export const AVATAR = ["bg-[#fbe3cf] text-[#a24d0d]", "bg-[#dcebe3] text-[#1d5a48]", "bg-[#e1e7f5] text-[#1d4f91]", "bg-[#f3e1ea] text-[#8a2f5a]"];

export function Today({ api, L, go }: PageProps) {
  const ws = api.workspace;
  const hi = api.lang === "hi";
  const s = receivablesSummary(ws.invoices, ws.profile);
  const v = valueDelivered(ws);
  const f = cashForecast(ws);
  const trust = buyerTrust(ws);
  const ready = creditReadiness(ws);
  const al = alerts(ws);
  const tasks = s.overdue.slice(0, 3);
  const first = ws.profile.owner.split(" ")[0];
  const stage = { reminder: L("रिमाइंडर भेजें", "Send reminder"), "legal-notice": L("कानूनी नोटिस भेजें", "Send legal notice"), samadhaan: L("समाधान पर शिकायत", "File on Samadhaan"), none: "" };
  const missing = ready.factors.filter((x) => x.points < x.max).sort((a, b) => b.max - b.points - (a.max - a.points))[0];

  return (
    <div className="space-y-5">
      <div className="pt-4">
        <p className="text-[13.5px] text-muted">{todayUtc().toLocaleDateString(hi ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}</p>
        <h1 className="mt-1 font-display text-[46px] leading-[0.95] tracking-tight sm:text-[58px]">
          {L("नमस्ते, ", "Namaste, ")}
          <span className="italic text-accent">{L(`${first} जी`, `${first} ji`)}</span>
        </h1>
        <p className="mt-2 text-[15.5px] text-ink-2">
          {tasks.length ? L(`आज ${tasks.length} ज़रूरी काम हैं। चलिए पैसा वापस लाते हैं।`, `${tasks.length} important tasks today. Let's bring your money back.`) : L("आज कोई ज़रूरी काम नहीं। बढ़िया!", "Nothing urgent today. Great!")}
        </p>
      </div>

      {/* Value meter */}
      <motion.div data-tour="stuck" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
        <Card dark className="relative overflow-hidden !p-6 sm:!p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-saffron/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-accent/50 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <p className="text-[14px] text-white/60">{L("साथी आपके लिए इतना पैसा वापस ला सकता है", "Money Saathi can unlock for you")}</p>
              <p className="mt-1 font-display text-[60px] leading-none tracking-tight sm:text-[84px]">
                <CountUp value={v.unlockableInr} duration={1.4} />
              </p>
              <p className="mt-3 text-[14px] text-white/70">
                {L(`${inr(s.overdueAmountInr)} बकाया + ${inr(s.interestClaimableInr)} कानूनी ब्याज (MSMED धारा 16)`, `${inr(s.overdueAmountInr)} overdue + ${inr(s.interestClaimableInr)} legal interest (MSMED s.16)`)}
              </p>
              <button onClick={() => go("vasooli")} className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13.5px] font-semibold text-ink transition-transform hover:scale-[1.03] active:scale-95">
                {L("वसूली शुरू करें", "Start recovering")} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: L("अब तक वसूला", "Recovered so far"), val: <CountUp value={v.recoveredInr} />, accent: "text-[#9be3bd]" },
                { k: L("नोटिस भेजे", "Notices sent"), val: <CountUp value={v.noticesSent} prefix="" /> },
                { k: L("जोखिम वाले खरीदार", "Risky buyers flagged"), val: <CountUp value={v.riskyBuyers} prefix="" />, accent: "text-[#f6c08a]" },
                { k: L("योजनाएं मिलीं", "Schemes found"), val: <CountUp value={v.schemesFound} prefix="" /> },
              ].map((x, i) => (
                <motion.div key={x.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.07 }} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur">
                  <p className="text-[12px] text-white/55">{x.k}</p>
                  <p className={`mt-1 font-display text-[30px] leading-none ${x.accent ?? ""}`}>{x.val}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Proactive alerts */}
      {al.length > 0 && (
        <div data-tour="alerts">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-[28px] leading-none">{L("ध्यान दें", "Heads-up")}</h2>
            <span className="text-[13px] text-muted">{L("पैसा अटकने से पहले रोकिए", "Stop money getting stuck before it happens")}</span>
          </div>
          <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-3 md:grid-cols-2">
            {al.map((a) => {
              const t = hi ? a.hi : a.en;
              const style = ALERT_STYLE[a.kind];
              return (
                <motion.div key={a.id} variants={stagger.item} whileHover={{ y: -3 }} transition={spring} className="flex items-start gap-3.5 rounded-[22px] border border-black/[0.07] bg-white p-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${style.cls}`}>{style.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold leading-snug">{t.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{t.body}</p>
                    {a.action && (
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger(a.action!.name, a.action!.context)} className={`mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold ${a.kind === "follow-up" || a.kind === "due-soon" ? "bg-accent text-white" : "border border-black/10 hover:bg-sunken"}`}>
                        {hi ? a.action.hi : a.action.en} <ArrowRight className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* Tasks */}
      <div data-tour="tasks">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-[28px] leading-none">{L("आज के काम", "Today's tasks")}</h2>
          <button onClick={() => go("vasooli")} className="text-[13px] font-medium text-accent hover:underline">
            {L("सभी देखें", "See all")}
          </button>
        </div>
        <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tasks.map((t, idx) => (
            <motion.div key={t.invoiceId} variants={stagger.item} whileHover={{ y: -6, rotate: idx % 2 ? 0.4 : -0.4 }} transition={spring} className="flex flex-col rounded-[24px] border border-black/[0.07] bg-white p-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-semibold ${AVATAR[idx % AVATAR.length]}`}>{t.buyer[0]}</div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{t.buyer}</p>
                  <p className="text-[12.5px] text-danger">{L(`${t.daysOverdue} दिन लेट`, `${t.daysOverdue} days late`)}</p>
                </div>
              </div>
              <p className="mt-4 font-display text-[36px] leading-none">{inr(t.amountInr)}</p>
              <p className="mt-1.5 text-[13px] text-warn">+ {inr(t.interestInr)} {L("कानूनी ब्याज", "legal interest")}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (t.daysOverdue / 90) * 100)}%` }} transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }} className={`h-full rounded-full ${t.daysOverdue > 45 ? "bg-danger" : "bg-saffron"}`} />
              </div>
              <div className="mt-3">
                <Badge tone={t.daysOverdue > 45 ? "danger" : "warn"} dot>
                  {stage[t.recommendedStage]}
                </Badge>
              </div>
              <motion.button
                data-tour={idx === 0 ? "recover" : undefined}
                whileTap={{ scale: 0.95 }}
                onClick={() => api.trigger("recover_invoice", { invoiceId: t.invoiceId })}
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-semibold text-white hover:bg-accent-hover"
              >
                <Scale className="h-4 w-4" /> {L("वसूली करें", "Recover")}
              </motion.button>
            </motion.div>
          ))}
          <motion.div variants={stagger.item} whileHover={{ y: -6 }} transition={spring} className="flex flex-col rounded-[24px] border-2 border-dashed border-accent/25 bg-accent-soft/60 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-accent">
              <Landmark className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-[28px] leading-tight">{L(`${v.schemesFound} सरकारी योजनाएं`, `${v.schemesFound} govt schemes`)}</p>
            <p className="mt-1 flex-1 text-[13.5px] text-ink-2">{L("4 सवालों में जानिए कौन सी लोन और सब्सिडी आपको मिल सकती है।", "Find out in 4 questions which loans and subsidies you can get.")}</p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger("start_schemes")} className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl bg-white text-[15px] font-semibold text-accent">
              {L("जांचें", "Check now")}
            </motion.button>
          </motion.div>
          {tasks.length < 3 && (
            <motion.div variants={stagger.item} whileHover={{ y: -6 }} transition={spring} className="flex flex-col rounded-[24px] border-2 border-dashed border-black/10 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken">
                <Plus className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-[28px] leading-tight">{L("आज की बिक्री", "Today's sales")}</p>
              <p className="mt-1 flex-1 text-[13.5px] text-ink-2">{L("बिल जोड़िए, देय तिथि हम याद रखेंगे।", "Add a bill and we'll remember the due date.")}</p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger("new_invoice")} className="mt-5 inline-flex h-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-[15px] font-semibold">
                {L("बिल जोड़ें", "Add invoice")}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Insights bento */}
      <div data-tour="insights" className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="lg:col-span-2">
          <Card className="h-full">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-info">
                  <TrendingUp className="h-4 w-4" /> {L("मुनीम · कैश अनुमान", "Munim · cash forecast")}
                </p>
                <p className="mt-1 font-display text-[28px] leading-tight">{L("अगले 30 दिन में", "Next 30 days")}</p>
              </div>
              <div className="flex gap-5">
                <div>
                  <p className="text-[12px] text-muted">{L("पक्का-सा आएगा", "Likely to arrive")}</p>
                  <p className="font-display text-[26px] leading-none text-accent">
                    <CountUp value={f.next30Expected} />
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-muted">{L("लेट-पेयर्स पर टिका", "Depends on late payers")}</p>
                  <p className="font-display text-[26px] leading-none text-saffron">
                    <CountUp value={f.next30AtRisk} />
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5">
              <ForecastBars weeks={f.weeks.map((w, i) => ({ ...w, label: i === 0 ? L("इस हफ़्ते", "This wk") : L(`+${i} हफ़्ते`, `+${i} wk`) }))} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-accent" /> {L("भरोसेमंद खरीदार", "Reliable buyers")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-saffron" /> {L("लेट/जोखिम वाले", "Late / risky")}
              </span>
              <button onClick={() => api.trigger("show_forecast")} className="ml-auto font-medium text-accent hover:underline">
                {L("साथी से समझें", "Explain with Saathi")} →
              </button>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.6 }}>
          <Card className="flex h-full flex-col">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-accent">
              <ShieldCheck className="h-4 w-4" /> {L("योजना · लोन तैयारी", "Yojana · loan readiness")}
            </p>
            <div className="mt-3 flex items-center gap-5">
              <ScoreRing value={ready.score} size={112} color={ready.band === "strong" ? "#17734a" : ready.band === "fair" ? "#c46a12" : "#b42318"} label="/100" />
              <div>
                <p className="font-display text-[26px] leading-tight">{{ strong: L("मज़बूत", "Strong"), fair: L("ठीक-ठाक", "Fair"), weak: L("सुधार चाहिए", "Needs work") }[ready.band as "strong"]}</p>
                {missing && <p className="mt-1 text-[13px] text-ink-2">{hi ? missing.tipHi : missing.tipEn}</p>}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => api.trigger("show_readiness")} className="mt-auto inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 pt-0 text-[14px] font-semibold hover:bg-sunken">
              {L("स्कोर कैसे बढ़ाएं", "How to improve")}
            </motion.button>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.6 }} className="lg:col-span-3">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-saffron">{L("वसूली · खरीदार भरोसा", "Vasooli · buyer trust")}</p>
                <p className="mt-1 font-display text-[28px] leading-tight">{L("किसे उधार दें, किसे नहीं", "Who to give credit to")}</p>
              </div>
              <button onClick={() => go("vasooli")} className="text-[13px] font-medium text-accent hover:underline">
                {L("सभी खरीदार", "All buyers")} →
              </button>
            </div>
            <motion.div variants={stagger.container} initial="hidden" animate="show" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {trust.slice(0, 6).map((t) => (
                <motion.div key={t.buyer} variants={stagger.item} whileHover={{ scale: 1.02 }} transition={spring} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                  <ScoreRing value={t.score} size={52} stroke={5} color={gradeColor[t.grade]} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">
                      {t.buyer} <span className="ml-1 rounded-md px-1.5 text-[11px] font-bold text-white" style={{ background: gradeColor[t.grade] }}>{t.grade}</span>
                    </p>
                    <p className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">{hi ? t.advice.hi : t.advice.en}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Card>
        </motion.div>
      </div>

      <Card>
        <p className="font-display text-[24px] leading-tight">{L("हाल की गतिविधि", "Recent activity")}</p>
        <motion.ul variants={stagger.container} initial="hidden" animate="show" className="mt-3 divide-y divide-line">
          {ws.activity.slice(0, 6).map((a) => (
            <motion.li variants={stagger.item} key={a.id} className="flex items-center justify-between gap-4 py-2.5">
              <span className="flex min-w-0 items-center gap-3 text-[14px] text-ink-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.kind === "payment" ? "bg-ok" : a.kind === "notice" ? "bg-saffron" : a.kind === "scheme" ? "bg-accent" : "bg-info"}`} />
                <span className="truncate">{hi ? (a.textHi ?? a.text) : a.text}</span>
              </span>
              <span className="shrink-0 text-[12px] text-faint">{new Date(a.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </motion.li>
          ))}
        </motion.ul>
      </Card>
    </div>
  );
}
