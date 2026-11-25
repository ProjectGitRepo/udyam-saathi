"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight, BookOpen, Check, Landmark, Mic, Scale, Volume2, Wallet } from "lucide-react";
import { CountUp, Reveal, spring } from "@/ui/motion";
import { speak, stopSpeaking } from "@/ui/speak";
import { msmedInterest, RBI_BANK_RATE_PCT, NO_AGREEMENT_DAYS, receivablesSummary } from "@/lib/vasooli";
import { buildDemoWorkspace } from "@/lib/demo-data";
import { buyerTrust, cashForecast, creditReadiness, valueDelivered } from "@/lib/insights";
import { matchSchemes } from "@/lib/schemes";
import type { BusinessProfile } from "@/lib/types";

type Lang = "hi" | "en";
const LANG_KEY = "udyam-saathi:lang";

export default function Landing() {
  const [lang, setLangState] = useState<Lang>("hi");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved language once on mount
      if (saved === "en" || saved === "hi") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };
  const L = (hi: string, en: string) => (lang === "hi" ? hi : en);
  const appHref = `/app?tour=1&lang=${lang}`;

  return (
    <div className="min-h-full overflow-x-hidden bg-cream text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-cream/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-[15px] font-semibold text-white">उ</div>
            <span className="text-[15px] font-semibold tracking-tight">Udyam Saathi</span>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch lang={lang} setLang={setLang} />
            <Link href={appHref} className="hidden h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13.5px] font-medium text-white transition-transform hover:scale-[1.03] active:scale-95 sm:inline-flex">
              {L("ऐप खोलें", "Open app")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <Hero L={L} lang={lang} appHref={appHref} />
      <Ticker L={L} />
      <Calculator L={L} />
      <Suspense fallback={<div className="h-[560px]" />}>
        <ValueStory L={L} />
      </Suspense>
      <Powers L={L} />
      <SchemeFinder L={L} lang={lang} />
      <HowItWorks L={L} />
      <FinalCta L={L} appHref={appHref} />

      <footer className="border-t border-black/5 px-6 py-8 text-center text-[12px] text-muted">
        {L("Udyam Saathi एक स्वतंत्र उत्पाद है, भारत सरकार से संबद्ध नहीं। कानूनी सलाह नहीं।", "Udyam Saathi is an independent product, not affiliated with the Government of India. Not legal advice.")}
      </footer>
    </div>
  );
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="relative flex rounded-full border border-black/10 bg-white/70 p-1 text-[13px]">
      {(["hi", "en"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className="relative z-10 rounded-full px-3.5 py-1 font-medium">
          {lang === l && <motion.span layoutId="lang-pill" transition={spring} className="absolute inset-0 -z-10 rounded-full bg-ink" />}
          <span className={lang === l ? "text-white" : "text-ink-2"}>{l === "hi" ? "हिंदी" : "English"}</span>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Hero

function HearButton({ L, lang }: { L: (h: string, e: string) => string; lang: Lang }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const intro = L(
    "नमस्ते! मैं उद्यम साथी हूँ। जिसने आपका पैसा रोका है, उससे कानूनी ब्याज के साथ वसूली में मदद करता हूँ, आपके लिए सरकारी योजनाएं ढूंढता हूँ, और आपका हिसाब रखता हूँ।",
    "Namaste! I'm Udyam Saathi. I help you recover late payments with legal interest, find government schemes for you, and keep your accounts — all in your language.",
  );
  const onClick = async () => {
    if (state !== "idle") {
      stopSpeaking();
      setState("idle");
      return;
    }
    setState("loading");
    const ok = await speak(intro, lang, () => setState("idle"));
    setState((s) => (s === "loading" ? (ok ? "playing" : "idle") : s));
  };
  return (
    <button onClick={onClick} className="relative inline-flex h-12 items-center gap-2.5 overflow-hidden rounded-full border border-black/10 bg-white/70 px-5 text-[14.5px] font-medium transition-colors hover:bg-white">
      {state === "playing" ? (
        <span className="flex h-4 items-end gap-[3px]">
          {[0, 1, 2, 3].map((i) => (
            <motion.span key={i} className="w-[3px] rounded-full bg-saffron" animate={{ height: [4, 16, 6, 12, 4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }} />
          ))}
        </span>
      ) : state === "loading" ? (
        <motion.span className="h-4 w-4 rounded-full border-2 border-saffron border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
      ) : (
        <Volume2 className="h-4 w-4 text-saffron" />
      )}
      {state === "loading" ? L("आवाज़ आ रही है…", "Loading voice…") : state === "playing" ? L("सुन रहे हैं… रोकने के लिए दबाएं", "Playing… tap to stop") : L("सुनिए कैसे काम करता है", "Hear how it works")}
    </button>
  );
}

/** Small lotus motif — used as the separator in the ticker. */
function Lotus({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16 2c2.6 3.2 3.4 7.6 0 13.5C12.6 9.6 13.4 5.2 16 2Z" />
      <path d="M6.5 7.5c4.2.2 7.6 3.2 9 8-4.6-.2-8-3.2-9-8Z" opacity=".85" />
      <path d="M25.5 7.5c-4.2.2-7.6 3.2-9 8 4.6-.2 8-3.2 9-8Z" opacity=".85" />
      <path d="M1.5 12.5c4.4-.6 9 1.4 12 4.8-4.6 1-9.2-.8-12-4.8Z" opacity=".6" />
      <path d="M30.5 12.5c-4.4-.6-9 1.4-12 4.8 4.6 1 9.2-.8 12-4.8Z" opacity=".6" />
      <path d="M7 19.5c2.6 1.5 5.6 2.2 9 2.2s6.4-.7 9-2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Hero({ L, lang, appHref }: { L: (h: string, e: string) => string; lang: Lang; appHref: string }) {
  const line1 = L("आपका पैसा अटका है।", "Your money is stuck.");
  const line2 = L("चलिए, वापस लाते हैं।", "Let's bring it back.");
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20">
      <div className="pointer-events-none absolute -right-40 top-10 h-[420px] w-[420px] rounded-full bg-saffron/25 blur-[90px]" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-[320px] w-[320px] rounded-full bg-accent/15 blur-[90px]" />
      <div className="relative">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-[12.5px] font-medium text-ink-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-saffron" />
          {L("भारत के छोटे बिज़नेस के लिए बना", "Made for the small businesses of Bharat")}
        </motion.p>
        <h1 className="mt-5 font-display text-[44px] leading-[1.02] tracking-tight sm:text-[64px] md:text-[72px]">
          <Words text={line1} key={`a-${lang}`} />
          <br />
          <span className="italic text-accent">
            <Words text={line2} delay={0.35} key={`b-${lang}`} />
          </span>
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }} className="mt-5 max-w-md text-[16px] leading-relaxed text-ink-2">
          {L(
            "उधारी वसूलें, सरकारी योजनाएं पाएं, और बही-खाता रखें — बोलकर, अपनी भाषा में। कोई ऐप सीखने की ज़रूरत नहीं।",
            "Recover late payments, find government schemes and keep your books — just by speaking, in your language. Nothing to learn.",
          )}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.6 }} className="mt-8 flex flex-wrap items-center gap-3">
          <Link href={appHref} className="group inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(29,90,72,0.7)] transition-transform hover:scale-[1.03] active:scale-95">
            {L("शुरू करें — मुफ़्त", "Start — it's free")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <HearButton L={L} lang={lang} />
        </motion.div>
      </div>
      <HeroDemo L={L} />
    </section>
  );
}

function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: delay + i * 0.07, duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="inline-block">
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </>
  );
}

/** Auto-playing story card with mouse-parallax tilt. */
function HeroDemo({ L }: { L: (h: string, e: string) => string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 2600);
    return () => clearInterval(t);
  }, []);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 18 });

  const steps = [
    { icon: <Mic className="h-4 w-4" />, who: L("आप", "You"), text: L("“Sharma Traders ने 60 दिन से ₹2,40,000 नहीं दिए”", "“Sharma Traders hasn't paid ₹2,40,000 for 60 days”") },
    { icon: <Scale className="h-4 w-4" />, who: "Saathi", text: L("कानून के हिसाब से 30 दिन लेट। आप ₹3,300 ब्याज भी मांग सकते हैं।", "30 days past the legal limit. You can also claim ₹3,300 interest.") },
    { icon: <Landmark className="h-4 w-4" />, who: "Saathi", text: L("31 मार्च तक भुगतान नहीं हुआ तो उनकी टैक्स छूट जाएगी — यही दबाव काम करेगा।", "If unpaid by 31 March, they lose their tax deduction — that's your leverage.") },
    { icon: <Check className="h-4 w-4" />, who: "Saathi", text: L("कानूनी नोटिस तैयार है। मंज़ूर करें और WhatsApp पर भेजें।", "Legal notice is ready. Approve and send on WhatsApp.") },
  ];

  return (
    <div
      className="relative [perspective:1200px]"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto w-full max-w-[420px] rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_40px_80px_-30px_rgba(25,25,24,0.35)]"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] text-muted">{L("आपका अटका पैसा", "Money stuck with buyers")}</p>
            <p className="font-display text-[44px] leading-none tracking-tight">
              <CountUp value={step >= 1 ? 463500 : 0} />
            </p>
          </div>
          <motion.div animate={{ rotate: step * 90 }} transition={spring} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-saffron-soft text-saffron">
            <Wallet className="h-5 w-5" />
          </motion.div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sunken">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-[#4c9a7f]" animate={{ width: `${25 + step * 25}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="relative mt-5 h-[250px] overflow-hidden" style={{ transform: "translateZ(40px)" }}>
          <AnimatePresence mode="popLayout">
            {steps.slice(0, step + 1).slice(-2).map((s, i, arr) => (
              <motion.div
                key={s.text}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: i === arr.length - 1 ? 1 : 0.45, y: 0, scale: i === arr.length - 1 ? 1 : 0.97 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={spring}
                className={`mb-3 rounded-2xl border p-3.5 ${s.who === "Saathi" ? "border-accent/15 bg-accent-soft" : "ml-8 border-black/5 bg-sunken"}`}
              >
                <p className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
                  {s.icon} {s.who}
                </p>
                <p className="text-[14px] leading-snug">{s.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="mt-1 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <motion.span key={i} animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.3 }} className="h-1.5 rounded-full bg-ink" />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------ Ticker

function Ticker({ L }: { L: (h: string, e: string) => string }) {
  const items = L(
    "नमकीन निर्माता · किराना · दर्ज़ी · फैब्रिकेटर · प्रिंटिंग प्रेस · कैटरर · फर्नीचर · पैकेजिंग · ऑटो पार्ट्स · कपड़ा · मिठाई · इलेक्ट्रिशियन",
    "Namkeen makers · Kirana · Tailors · Fabricators · Printing presses · Caterers · Furniture · Packaging · Auto parts · Textiles · Sweet shops · Electricians",
  ).split(" · ");
  return (
    <div className="relative overflow-hidden border-y border-black/5 bg-white/50 py-4">
      <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-10 whitespace-nowrap font-display text-[22px] text-ink-2">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10">
            {t} <Lotus className="h-6 w-8 text-saffron" />
          </span>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Calculator

function Calculator({ L }: { L: (h: string, e: string) => string }) {
  const [amount, setAmount] = useState(240000);
  const [daysSince, setDaysSince] = useState(60);
  const [credit, setCredit] = useState(30);
  const allowed = credit === 0 ? NO_AGREEMENT_DAYS : Math.min(credit, 45);
  const late = Math.max(0, daysSince - allowed);
  const interest = msmedInterest(amount, late);
  const stage = late === 0 ? "ok" : late <= 15 ? "reminder" : late <= 45 ? "notice" : "samadhaan";
  const stageLabel = {
    ok: L("अभी समय पर है", "Still on time"),
    reminder: L("विनम्र रिमाइंडर भेजें", "Send a polite reminder"),
    notice: L("कानूनी नोटिस भेजें", "Send a legal notice"),
    samadhaan: L("MSME समाधान पर शिकायत करें", "File on MSME Samadhaan"),
  }[stage];

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-saffron">{L("खुद आज़माइए", "Try it yourself")}</p>
        <h2 className="mt-2 max-w-2xl font-display text-[38px] leading-[1.05] tracking-tight sm:text-[52px]">
          {L("कानून आपके साथ है। ", "The law is on your side. ")}
          <span className="italic text-accent">{L("देखिए कितना।", "See how much.")}</span>
        </h2>
        <p className="mt-3 max-w-xl text-[15px] text-ink-2">
          {L(
            "MSMED कानून के अनुसार, तय समय (अधिकतम 45 दिन) के बाद भुगतान करने वाले खरीदार को RBI दर के तीन गुना ब्याज देना होता है। स्लाइडर खिसकाइए।",
            "Under the MSMED Act, a buyer who pays late owes interest at 3× the RBI bank rate. Move the sliders.",
          )}
        </p>
      </Reveal>
      <Reveal delay={0.1} className="mt-10 grid gap-6 rounded-[28px] border border-black/10 bg-white p-5 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.3)] sm:p-8 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-7">
          <Slider label={L("बिल की राशि", "Invoice amount")} value={amount} min={10000} max={1000000} step={5000} onChange={setAmount} display={`₹${amount.toLocaleString("en-IN")}`} />
          <Slider label={L("बिल को कितने दिन हुए", "Days since the invoice")} value={daysSince} min={0} max={180} step={1} onChange={setDaysSince} display={`${daysSince} ${L("दिन", "days")}`} />
          <div>
            <p className="mb-2 text-[13.5px] font-medium text-ink-2">{L("खरीदार से लिखित उधारी समझौता?", "Written credit agreement with the buyer?")}</p>
            <div className="flex flex-wrap gap-2">
              {[0, 15, 30, 45].map((d) => (
                <button key={d} onClick={() => setCredit(d)} className="relative rounded-full border border-black/10 px-4 py-2 text-[13.5px] font-medium">
                  {credit === d && <motion.span layoutId="credit-pill" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
                  <span className={`relative ${credit === d ? "text-white" : "text-ink-2"}`}>{d === 0 ? L("कोई नहीं", "None") : `${d} ${L("दिन", "days")}`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-3xl bg-ink p-6 text-white">
          <div>
            <p className="text-[13px] text-white/60">{L("कानूनी ब्याज जो आप मांग सकते हैं", "Legal interest you can claim")}</p>
            <p className="mt-1 font-display text-[56px] leading-none tracking-tight text-[#f6c08a]">
              <CountUp value={interest} duration={0.5} />
            </p>
            <div className="mt-5 space-y-2 text-[14px]">
              <Row k={L("कुल दावा", "Total claim")} v={<CountUp value={amount + interest} duration={0.5} />} />
              <Row k={L("कानूनी देय सीमा", "Legal due limit")} v={`${allowed} ${L("दिन", "days")}`} />
              <Row k={L("कितने दिन लेट", "Days late")} v={<span className={late ? "text-[#f6a28a]" : ""}>{late}</span>} />
              <Row k={L("ब्याज दर", "Interest rate")} v={`${3 * RBI_BANK_RATE_PCT}% p.a.`} />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className={`mt-6 rounded-2xl px-4 py-3 text-[14px] font-medium ${stage === "ok" ? "bg-white/10" : "bg-saffron text-white"}`}>
              {L("सुझाव: ", "Next step: ")}
              {stageLabel}
            </motion.div>
          </AnimatePresence>
        </div>
      </Reveal>
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-white/10 pb-2">
      <span className="text-white/60">{k}</span>
      <span className="tabular">{v}</span>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, display }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; display: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13.5px] font-medium text-ink-2">{label}</span>
        <span className="tabular font-display text-[26px] leading-none">{display}</span>
      </div>
      <div className="relative h-8">
        <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-sunken" />
        <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        <motion.div className="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-accent shadow-md" style={{ left: `${pct}%` }} whileTap={{ scale: 1.2 }} />
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} />
      </div>
    </label>
  );
}

// ------------------------------------------------------------------ Value story

function ValueStory({ L }: { L: (h: string, e: string) => string }) {
  const ws = useMemo(() => buildDemoWorkspace(), []);
  const v = valueDelivered(ws);
  const f = cashForecast(ws);
  const trust = buyerTrust(ws);
  const ready = creditReadiness(ws);
  const s = receivablesSummary(ws.invoices, ws.profile);
  const worst = trust[0];
  const tiles = [
    { k: L("कानूनी ब्याज जो वो छोड़ रहे थे", "Legal interest they didn't know they could claim"), v: <CountUp value={s.interestClaimableInr} />, tone: "text-saffron" },
    { k: L("जोखिम वाले खरीदार पकड़े", "Risky buyers flagged before the next order"), v: <CountUp value={v.riskyBuyers} prefix="" />, tone: "text-danger", sub: worst ? L(`जैसे ${worst.buyer} — औसतन ${worst.avgDaysLate} दिन लेट`, `e.g. ${worst.buyer} — ${worst.avgDaysLate} days late on average`) : undefined },
    { k: L("योजनाएं जिनके वो योग्य हैं", "Government schemes they qualify for"), v: <CountUp value={v.schemesFound} prefix="" />, tone: "text-accent" },
    { k: L("लोन तैयारी स्कोर", "Loan readiness score"), v: <><CountUp value={ready.score} prefix="" />/100</>, tone: "text-info", sub: L("और बढ़ाने के आसान कदम", "plus simple steps to raise it") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-saffron">{L("असली असर", "The real value")}</p>
        <h2 className="mt-2 max-w-3xl font-display text-[38px] leading-[1.05] tracking-tight sm:text-[52px]">
          {L("इंदौर की एक नमकीन दुकान। ", "One namkeen shop in Indore. ")}
          <span className="italic text-accent">{L("साथी ने 1 मिनट में यह पाया।", "Here's what Saathi found in a minute.")}</span>
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Reveal className="md:row-span-2">
          <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] bg-ink p-7 text-white">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-saffron/35 blur-3xl" />
            <div className="relative">
              <p className="text-[14px] text-white/60">{L("वापस लाने लायक पैसा", "Money it can bring back")}</p>
              <p className="mt-2 font-display text-[64px] leading-none tracking-tight">
                <CountUp value={v.unlockableInr} duration={1.6} />
              </p>
              <p className="mt-3 text-[14px] text-white/70">{L(`${s.overdueCount} खरीदारों के पास कानूनी समय से ज़्यादा रुका हुआ`, `held by ${s.overdueCount} buyers beyond the legal time limit`)}</p>
            </div>
            <div className="relative mt-8 rounded-2xl bg-white/[0.07] p-4">
              <p className="text-[12.5px] text-white/55">{L("अगले 30 दिन का कैश अनुमान", "Next 30 days cash forecast")}</p>
              <p className="mt-1 font-display text-[30px] leading-none">
                <CountUp value={f.next30Expected + f.next30AtRisk} />
              </p>
              <p className="mt-1 text-[12.5px] text-[#f6c08a]">{L(`इसमें ₹${f.next30AtRisk.toLocaleString("en-IN")} लेट-पेयर्स पर टिका है`, `₹${f.next30AtRisk.toLocaleString("en-IN")} of it depends on late payers`)}</p>
            </div>
          </div>
        </Reveal>
        {tiles.map((t, i) => (
          <Reveal key={t.k} delay={0.05 + i * 0.07}>
            <motion.div whileHover={{ y: -5 }} transition={spring} className="h-full rounded-[24px] border border-black/10 bg-white p-6">
              <p className={`font-display text-[48px] leading-none ${t.tone}`}>{t.v}</p>
              <p className="mt-3 text-[15px] font-medium leading-snug">{t.k}</p>
              {t.sub && <p className="mt-1 text-[13px] text-muted">{t.sub}</p>}
            </motion.div>
          </Reveal>
        ))}
      </div>
      <p className="mt-4 text-[12px] text-muted">{L("डेमो बिज़नेस के आंकड़े — हर संख्या असली कानूनी नियमों से कोड में गिनी गई।", "Demo business figures — every number computed in code from the actual legal rules.")}</p>
    </section>
  );
}

// ------------------------------------------------------------------ Powers

function Powers({ L }: { L: (h: string, e: string) => string }) {
  const items = [
    {
      icon: <Scale className="h-6 w-6" />,
      name: L("वसूली एजेंट", "Vasooli Agent"),
      title: L("अटका पैसा वापस", "Get stuck money back"),
      body: L("कौन लेट है, कितना ब्याज बनता है, और कौन सा नोटिस भेजना है — सब अपने आप।", "Who's late, how much interest is owed, which notice to send — all worked out for you."),
      points: [L("कानूनी ब्याज की गणना", "Legal interest, calculated"), L("नोटिस → समाधान शिकायत", "Notice → Samadhaan filing"), L("खरीदार भरोसा स्कोर", "Buyer trust score")],
      tint: "bg-saffron-soft text-saffron",
    },
    {
      icon: <Landmark className="h-6 w-6" />,
      name: L("योजना एजेंट", "Yojana Agent"),
      title: L("आपके लिए सरकारी योजनाएं", "Government schemes for you"),
      body: L("4 आसान सवाल, और आपको पता चलेगा कि कौन सी लोन और सब्सिडी आपको मिल सकती है।", "Answer 4 simple questions and see which loans and subsidies you can get."),
      points: [L("केंद्र + राज्य योजनाएं", "Central + state schemes"), L("ज़रूरी कागज़ात की सूची", "Document checklist"), L("लोन तैयारी स्कोर", "Loan readiness score")],
      tint: "bg-accent-soft text-accent",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      name: L("मुनीम एजेंट", "Munim Agent"),
      title: L("बही-खाता बिना झंझट", "Books without the hassle"),
      body: L("बिल बोलकर जोड़िए। देय तिथि और याद दिलाना हम संभालेंगे।", "Add bills by speaking. We'll track due dates and remind you."),
      points: [L("बोलकर बिल जोड़ें", "Add bills by voice"), L("देय तिथि अलर्ट", "Due-date alerts"), L("30 दिन का कैश अनुमान", "30-day cash forecast")],
      tint: "bg-info-soft text-info",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="font-display text-[38px] leading-[1.05] tracking-tight sm:text-[52px]">
          {L("तीन साथी, ", "Three helpers, ")}
          <span className="italic text-accent">{L("एक जगह।", "one place.")}</span>
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.name} delay={i * 0.08}>
            <motion.div whileHover={{ y: -6 }} transition={spring} className="group h-full rounded-[24px] border border-black/10 bg-white p-6">
              <motion.div whileHover={{ rotate: -8, scale: 1.08 }} transition={spring} className={`flex h-12 w-12 items-center justify-center rounded-2xl ${it.tint}`}>
                {it.icon}
              </motion.div>
              <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">{it.name}</p>
              <h3 className="mt-1 font-display text-[28px] leading-tight">{it.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{it.body}</p>
              <ul className="mt-4 space-y-1.5 border-t border-black/5 pt-4">
                {it.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-[13.5px] text-ink-2">
                    <Check className="h-4 w-4 text-accent" /> {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Scheme finder

const BASE: BusinessProfile = {
  name: "",
  owner: "",
  city: "Indore",
  state: "Madhya Pradesh",
  sector: "manufacturing",
  activity: "",
  employees: 5,
  investmentInr: 2_000_000,
  turnoverInr: 8_000_000,
  udyamRegistered: true,
  ownerAge: 32,
};

function SchemeFinder({ L, lang }: { L: (h: string, e: string) => string; lang: Lang }) {
  const [flags, setFlags] = useState({ newUnit: false, woman: false, artisan: false, scst: false, mp: true, udyam: true });
  const profile = useMemo<BusinessProfile>(
    () => ({ ...BASE, isNewEnterprise: flags.newUnit, ownerIsWoman: flags.woman, isArtisan: flags.artisan, ownerIsScSt: flags.scst, state: flags.mp ? "Madhya Pradesh" : "Karnataka", udyamRegistered: flags.udyam }),
    [flags],
  );
  const eligible = matchSchemes(profile).eligible;
  const chips: { key: keyof typeof flags; label: string }[] = [
    { key: "udyam", label: L("उद्यम पंजीकृत", "Udyam registered") },
    { key: "mp", label: L("मध्य प्रदेश में", "Based in MP") },
    { key: "newUnit", label: L("नई यूनिट शुरू कर रहे", "Starting a new unit") },
    { key: "woman", label: L("महिला उद्यमी", "Woman-led") },
    { key: "scst", label: L("SC/ST उद्यमी", "SC/ST entrepreneur") },
    { key: "artisan", label: L("पारंपरिक कारीगर", "Traditional artisan") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 rounded-[32px] bg-accent p-6 text-white sm:p-10 md:grid-cols-2">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#f6c08a]">{L("योजना खोजक", "Scheme finder")}</p>
          <h2 className="mt-2 font-display text-[38px] leading-[1.05] tracking-tight sm:text-[48px]">{L("जो आप पर लागू हो, उसे छुइए।", "Tap what's true for you.")}</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {chips.map((c) => {
              const on = flags[c.key];
              return (
                <motion.button key={c.key} whileTap={{ scale: 0.92 }} onClick={() => setFlags((f) => ({ ...f, [c.key]: !f[c.key] }))} className={`flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[14px] font-medium transition-colors ${on ? "border-white bg-white text-accent" : "border-white/30 text-white hover:bg-white/10"}`}>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: "auto", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="overflow-hidden">
                        <Check className="h-4 w-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {c.label}
                </motion.button>
              );
            })}
          </div>
        </Reveal>
        <div>
          <p className="text-[14px] text-white/70">{L("आपके लिए योजनाएं", "Schemes you can use")}</p>
          <p className="font-display text-[72px] leading-none">
            <CountUp value={eligible.length} prefix="" duration={0.5} />
          </p>
          <motion.ul layout className="mt-4 space-y-2">
            <AnimatePresence initial={false}>
              {eligible.slice(0, 6).map((s) => (
                <motion.li key={s.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={spring} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-2.5 text-[14px]">
                  <span>{lang === "hi" ? s.nameHi : s.name}</span>
                  <span className="text-[11px] uppercase tracking-wider text-white/60">{s.level === "central" ? L("केंद्र", "Central") : "MP"}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ How it works

function HowItWorks({ L }: { L: (h: string, e: string) => string }) {
  const steps = [
    { n: "1", t: L("बोलिए", "Speak"), d: L("“किसका पैसा बाकी है?” — हिंदी में, जैसे आप मुनीम से पूछते।", "“Who owes me money?” — in Hindi, like you'd ask your munim.") },
    { n: "2", t: L("साथी हिसाब लगाता है", "Saathi works it out"), d: L("कानून के हिसाब से तारीख, ब्याज और अगला कदम — कोड से, अंदाज़े से नहीं।", "Dates, interest and next step per the law — computed, never guessed.") },
    { n: "3", t: L("आप मंज़ूर करें", "You approve"), d: L("आपकी हाँ के बिना कुछ नहीं जाता। फिर WhatsApp पर एक टैप में।", "Nothing goes out without your yes. Then one tap to WhatsApp.") },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Reveal>
        <h2 className="font-display text-[38px] leading-[1.05] tracking-tight sm:text-[52px]">{L("कैसे काम करता है", "How it works")}</h2>
      </Reveal>
      <div className="relative mt-10 grid gap-6 md:grid-cols-3">
        <div className="absolute left-0 right-0 top-7 hidden h-px bg-black/10 md:block" />
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.12} className="relative">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-cream font-display text-[26px]">{s.n}</div>
            <h3 className="mt-4 text-[18px] font-semibold">{s.t}</h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{s.d}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FinalCta({ L, appHref }: { L: (h: string, e: string) => string; appHref: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-[32px] bg-ink px-6 py-14 text-center text-white sm:px-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-saffron/30 blur-[80px]" />
        <h2 className="relative font-display text-[40px] leading-[1.05] tracking-tight sm:text-[60px]">
          {L("एक मिनट में शुरू करें।", "Start in one minute.")}
          <br />
          <span className="italic text-[#f6c08a]">{L("हम हर कदम पर साथ हैं।", "We'll guide every step.")}</span>
        </h2>
        <Link href={appHref} className="relative mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-white px-8 text-[16px] font-semibold text-ink transition-transform hover:scale-[1.04] active:scale-95">
          {L("चलिए शुरू करें", "Let's begin")} <ArrowRight className="h-5 w-5" />
        </Link>
        <p className="relative mt-4 text-[13px] text-white/50">{L("कोई डाउनलोड नहीं · कोई फॉर्म नहीं · डेमो डेटा के साथ", "No download · no forms · comes with demo data")}</p>
      </Reveal>
    </section>
  );
}
