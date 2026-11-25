"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { ArrowUp, BellRing, BookOpen, Compass, HandCoins, Landmark, Languages, LayoutGrid, MessageSquare, Mic, Minus, RotateCcw, Scale, Send, Sparkles } from "lucide-react";
import { useWorkspace, type WorkspaceApi } from "./useWorkspace";
import { receivablesSummary } from "@/lib/vasooli";
import { Assistant } from "./Assistant";
import { Today } from "./pages/Today";
import { Vasooli } from "./pages/Vasooli";
import { Munim } from "./pages/Munim";
import { Yojana } from "./pages/Yojana";
import { Outbox } from "./pages/Outbox";
import { Tour, type TourStep } from "./tour/Tour";
import { spring } from "@/ui/motion";

export type Page = "today" | "vasooli" | "munim" | "yojana" | "outbox";

export interface PageProps {
  api: WorkspaceApi;
  L: (hi: string, en: string) => string;
  go: (p: Page) => void;
  openAssistant: () => void;
}

const TOUR_KEY = "udyam-saathi:tour-done";
const dock = { type: "spring" as const, stiffness: 300, damping: 32, mass: 0.9 };

export default function App() {
  const api = useWorkspace();
  const [page, setPage] = useState<Page>("today");
  const [saathiOpen, setSaathiOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("tour") === "1" || !localStorage.getItem(TOUR_KEY);
    } catch {
      return false;
    }
  });
  const L = (hi: string, en: string) => (api.lang === "hi" ? hi : en);
  const summary = receivablesSummary(api.workspace.invoices, api.workspace.profile);
  const drafts = api.workspace.notices.filter((n) => n.status !== "sent").length;
  const first = summary.overdue[0];

  useEffect(() => {
    try {
      if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const nav: { id: Page; label: string; icon: ReactNode; count?: number }[] = [
    { id: "today", label: L("आज", "Today"), icon: <LayoutGrid className="h-4 w-4" /> },
    { id: "vasooli", label: L("वसूली", "Vasooli"), icon: <Scale className="h-4 w-4" />, count: summary.overdueCount },
    { id: "munim", label: L("मुनीम", "Munim"), icon: <BookOpen className="h-4 w-4" /> },
    { id: "yojana", label: L("योजना", "Yojana"), icon: <Landmark className="h-4 w-4" /> },
    { id: "outbox", label: L("आउटबॉक्स", "Outbox"), icon: <Send className="h-4 w-4" />, count: drafts || undefined },
  ];

  const openAssistant = () => setSaathiOpen(true);
  const pageApi: WorkspaceApi = {
    ...api,
    trigger: (name, context) => {
      setSaathiOpen(true);
      return api.trigger(name, context);
    },
  };
  const props: PageProps = { api: pageApi, L, go: setPage, openAssistant };
  const firstName = api.workspace.profile.owner.split(" ")[0];

  const closeTour = () => {
    setTourOpen(false);
    try {
      localStorage.setItem(TOUR_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const steps: TourStep[] = [
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: L(`नमस्ते ${firstName} जी!`, `Namaste ${firstName} ji!`),
      body: L("1 मिनट में आपको सब दिखाता हूँ। “पढ़कर सुनाएं” दबाएं तो मैं हर बात बोलकर बताऊंगा।", "Let me show you around in one minute. Tap “Read aloud” and I'll speak each tip."),
      before: () => {
        setPage("today");
        setSaathiOpen(false);
      },
    },
    {
      target: "stuck",
      title: L("साथी कितना पैसा दिला सकता है", "What Saathi can unlock for you"),
      body: L("खरीदारों के पास कानूनी समय से ज़्यादा रुका पैसा, और उस पर बनने वाला ब्याज — एक नज़र में।", "Money held by buyers past the legal limit, plus the interest you can claim — at a glance."),
      before: () => setPage("today"),
    },
    {
      target: "alerts",
      icon: <BellRing className="h-5 w-5" />,
      title: L("साथी पहले से चेतावनी देता है", "Saathi warns you early"),
      body: L("देय तिथि से पहले याद दिलाना, नोटिस के बाद फॉलो-अप, और किस खरीदार को उधारी रोकनी है — पैसा अटकने से पहले।", "Reminders before due dates, follow-ups after notices, and which buyers to stop giving credit — before money gets stuck."),
      before: () => setPage("today"),
    },
    {
      target: "tasks",
      icon: <HandCoins className="h-5 w-5" />,
      title: L("आज के काम", "Today's tasks"),
      body: L("हर कार्ड एक ऐसा पैसा है जो आप वापस ला सकते हैं। सबसे ज़रूरी सबसे पहले।", "Each card is money you can bring back. The most urgent one comes first."),
      before: () => setPage("today"),
    },
    {
      target: "recover",
      title: L("बस “वसूली करें” दबाइए", "Just tap “Recover”"),
      body: L("साथी बताएगा कितना ब्याज बनता है, कौन सा नोटिस भेजना है — और नोटिस लिख भी देगा।", "Saathi tells you the interest owed, which notice to send — and writes it for you."),
      before: () => setPage("today"),
    },
    {
      target: "insights",
      title: L("आगे की तस्वीर", "See what's coming"),
      body: L("अगले हफ़्तों में कितना पैसा आएगा, किस खरीदार पर भरोसा करें, और क्या आपको लोन मिल सकता है।", "How much money will arrive in the coming weeks, which buyers to trust, and whether you're loan-ready."),
      before: () => setPage("today"),
    },
    {
      target: "nav",
      title: L("तीन एजेंट, तीन काम", "Three agents, three jobs"),
      body: L("वसूली — पैसा वापस। मुनीम — हिसाब और कैश। योजना — सरकारी योजनाएं और लोन।", "Vasooli — get money back. Munim — books and cash. Yojana — schemes and loans."),
    },
    {
      target: "saathi",
      icon: <MessageSquare className="h-5 w-5" />,
      title: L("साथी से कुछ भी पूछिए", "Ask Saathi anything"),
      body: L("जैसे अपने मुनीम से पूछते हैं: “किसका पैसा बाकी है?”", "Like you'd ask your munim: “Who owes me money?”"),
      before: () => setSaathiOpen(false),
    },
    {
      target: "mic",
      icon: <Mic className="h-5 w-5" />,
      title: L("टाइप नहीं करना? बोलिए!", "Don't want to type? Speak!"),
      body: L("माइक दबाइए और हिंदी में बोलिए।", "Tap the mic and speak in Hindi."),
      before: () => setSaathiOpen(false),
    },
    {
      target: "lang",
      icon: <Languages className="h-5 w-5" />,
      title: L("भाषा बदलिए", "Switch language"),
      body: L("हिंदी या English — कभी भी।", "Hindi or English — any time."),
    },
    {
      icon: <Compass className="h-5 w-5" />,
      title: L("आप तैयार हैं!", "You're all set!"),
      body: first
        ? L(`चलिए पहला काम करते हैं: ${first.buyer} से ₹${first.amountInr.toLocaleString("en-IN")} की वसूली।`, `Let's do the first task: recover ₹${first.amountInr.toLocaleString("en-IN")} from ${first.buyer}.`)
        : L("कभी भी टूर दोबारा देख सकते हैं।", "You can replay this tour any time."),
      cta: first ? { label: L("अभी करें", "Do it now"), onClick: () => pageApi.trigger("recover_invoice", { invoiceId: first.invoiceId }) } : undefined,
    },
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-cream">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-saffron/15 blur-[110px]" />
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[110px]" />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[76px] items-center justify-between gap-3 px-4 sm:px-6 [&>*]:pointer-events-auto">
        <Link href="/" className="hidden shrink-0 items-center gap-2.5 sm:flex">
          <motion.div whileHover={{ rotate: -10, scale: 1.08 }} transition={spring} className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-[16px] font-semibold text-white">
            उ
          </motion.div>
          <span className="hidden text-[15px] font-semibold tracking-tight md:block">Udyam Saathi</span>
        </Link>

        <LayoutGroup>
          <nav data-tour="nav" className="glass flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1">
            {nav.map((n) => (
              <button key={n.id} onClick={() => setPage(n.id)} className="relative flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13.5px] font-medium sm:gap-1.5 sm:px-4">
                {page === n.id && <motion.span layoutId="top-pill" transition={spring} className="glass-ink absolute inset-0 rounded-full" />}
                <span className={`relative ${page === n.id ? "text-white" : "text-muted"}`}>{n.icon}</span>
                <span className={`relative hidden sm:inline ${page === n.id ? "text-white" : "text-ink-2"}`}>{n.label}</span>
                {n.count ? (
                  <motion.span key={n.count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={spring} className={`tabular relative rounded-full px-1.5 text-[10.5px] font-bold ${page === n.id ? "bg-saffron text-white" : "bg-danger text-white"}`}>
                    {n.count}
                  </motion.span>
                ) : null}
              </button>
            ))}
          </nav>
        </LayoutGroup>

        <div className="flex shrink-0 items-center gap-2">
          <div data-tour="lang" className="glass hidden rounded-full p-1 text-[12.5px] sm:flex">
            {(["hi", "en"] as const).map((l) => (
              <button key={l} onClick={() => api.setLang(l)} className="relative rounded-full px-3 py-1 font-medium">
                {api.lang === l && <motion.span layoutId="app-lang" transition={spring} className="absolute inset-0 rounded-full bg-accent" />}
                <span className={`relative ${api.lang === l ? "text-white" : "text-ink-2"}`}>{l === "hi" ? "हिं" : "EN"}</span>
              </button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => api.setLang(api.lang === "hi" ? "en" : "hi")} className="glass flex h-9 w-9 items-center justify-center rounded-full sm:hidden" aria-label="Language">
            <Languages className="h-4 w-4" />
          </motion.button>
          <motion.button whileHover={{ rotate: 25 }} whileTap={{ scale: 0.9 }} onClick={() => setTourOpen(true)} title={L("टूर देखें", "Take the tour")} className="glass flex h-9 w-9 items-center justify-center rounded-full text-saffron">
            <Compass className="h-4 w-4" />
          </motion.button>
          <motion.button whileHover={{ rotate: -90 }} whileTap={{ scale: 0.9 }} onClick={api.reset} title={L("डेमो रीसेट", "Reset demo")} className="glass hidden h-9 w-9 items-center justify-center rounded-full text-muted md:flex">
            <RotateCcw className="h-4 w-4" />
          </motion.button>
        </div>
      </header>

      {/* Page */}
      <main className="pane-scroll relative z-10 min-h-0 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto max-w-[1240px] px-4 pb-36 pt-[76px] sm:px-6"
          >
            {page === "today" && <Today {...props} />}
            {page === "vasooli" && <Vasooli {...props} />}
            {page === "munim" && <Munim {...props} />}
            {page === "yojana" && <Yojana {...props} />}
            {page === "outbox" && <Outbox {...props} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Saathi dock — morphs between a pill and a full panel */}
      <div className={`pointer-events-none fixed z-30 flex ${saathiOpen ? "inset-0 items-end justify-end sm:p-4" : "inset-x-0 bottom-5 justify-center px-4"}`}>
        <motion.div
          layout
          transition={dock}
          style={{ borderRadius: saathiOpen ? 28 : 999 }}
          className={`pointer-events-auto flex flex-col overflow-hidden ${saathiOpen ? "glass-panel h-full w-full sm:h-[min(82vh,780px)] sm:w-[450px]" : "glass w-full max-w-[560px]"}`}
        >
          {saathiOpen ? (
            <motion.div key="open" data-panel="saathi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12, duration: 0.25 }} className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
                <div className="flex items-center gap-2.5">
                  <SaathiAvatar />
                  <div>
                    <p className="text-[14.5px] font-semibold">Saathi</p>
                    <p className="text-[11.5px] text-muted">{L("आपका डिजिटल मुनीम · ऑनलाइन", "Your digital munim · online")}</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSaathiOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-ink-2 hover:bg-line" aria-label="Minimise">
                  <Minus className="h-4 w-4" />
                </motion.button>
              </div>
              <Assistant api={api} L={L} />
            </motion.div>
          ) : (
            <DockPill
              L={L}
              lang={api.lang}
              onOpen={() => setSaathiOpen(true)}
              onSend={(t) => {
                setSaathiOpen(true);
                api.send(t);
              }}
            />
          )}
        </motion.div>
      </div>

      <Tour
        steps={steps}
        open={tourOpen}
        onClose={closeTour}
        lang={api.lang}
        labels={{
          next: L("आगे", "Next"),
          back: L("पीछे", "Back"),
          skip: L("छोड़ें", "Skip"),
          done: L("शुरू करें", "Let's go"),
          readAloud: L("पढ़कर सुनाएं", "Read aloud"),
          stepOf: (a, b) => L(`${b} में से ${a}`, `${a} of ${b}`),
        }}
      />
    </div>
  );
}

function SaathiAvatar() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white">
      सा
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#3fbf7f]" />
    </div>
  );
}

function DockPill({ L, lang, onOpen, onSend }: { L: (h: string, e: string) => string; lang: "hi" | "en"; onOpen: () => void; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const voice = () => {
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return alert(L("आवाज़ इनपुट के लिए Chrome इस्तेमाल करें।", "Voice input needs Chrome."));
    const rec = new Ctor();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => onSend(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };
  return (
    <motion.div key="pill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 p-2 pl-2">
      <button onClick={onOpen} aria-label="Open Saathi">
        <SaathiAvatar />
      </button>
      <form
        data-tour="saathi"
        className="flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) onSend(text.trim());
          else onOpen();
          setText("");
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={L("साथी से पूछें… “किसका पैसा बाकी है?”", "Ask Saathi… “Who owes me money?”")} className="h-10 w-full bg-transparent px-1 text-[14px] outline-none placeholder:text-faint" />
      </form>
      <motion.button data-tour="mic" whileTap={{ scale: 0.9 }} onClick={voice} aria-label="Voice input" className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${listening ? "bg-danger text-white" : "bg-saffron text-white"}`}>
        {listening && <motion.span className="absolute inset-0 rounded-full bg-danger" animate={{ scale: [1, 1.7], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }} />}
        <Mic className="relative h-[18px] w-[18px]" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => {
          if (!text.trim()) return onOpen();
          onSend(text.trim());
          setText("");
        }} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <ArrowUp className="h-[18px] w-[18px]" />
      </motion.button>
    </motion.div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-6">
      <div>
        {eyebrow && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-saffron">
            {eyebrow}
          </motion.p>
        )}
        <h1 className="mt-1 font-display text-[44px] leading-[0.95] tracking-tight sm:text-[54px]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[15px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Big rounded card used across the redesigned app */
export function Card({ children, className = "", dark, ...rest }: { children: ReactNode; className?: string; dark?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-[26px] border ${dark ? "border-transparent bg-ink text-white" : "border-black/[0.07] bg-white"} p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}
