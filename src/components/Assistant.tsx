"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, BellRing, Mic, Scale, Landmark, BookOpen, HandCoins } from "lucide-react";
import { A2UISurface } from "@/a2ui/Surface";
import type { WorkspaceApi } from "./useWorkspace";
import type { AgentName } from "@/agent/agent";
import { spring } from "@/ui/motion";

const AGENT_META: Record<AgentName, { en: string; hi: string; dot: string }> = {
  Saathi: { en: "Saathi", hi: "साथी", dot: "bg-ink-2" },
  Munim: { en: "Munim · ledger", hi: "मुनीम · बही-खाता", dot: "bg-info" },
  Vasooli: { en: "Vasooli · recovery", hi: "वसूली एजेंट", dot: "bg-saffron" },
  Yojana: { en: "Yojana · schemes", hi: "योजना एजेंट", dot: "bg-ok" },
};

export function Assistant({ api, L }: { api: WorkspaceApi; L: (hi: string, en: string) => string }) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const hi = api.lang === "hi";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [api.turns.length, api.busy]);

  const submit = () => {
    const t = text.trim();
    if (!t || api.busy) return;
    setText("");
    api.send(t);
  };

  function voice() {
    type SR = { lang: string; interimResults: boolean; onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void; start: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return alert(L("आवाज़ इनपुट के लिए Chrome इस्तेमाल करें।", "Voice input needs Chrome."));
    const rec = new Ctor();
    rec.lang = hi ? "hi-IN" : "en-IN";
    rec.interimResults = false;
    rec.onresult = (e) => api.send(e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }

  const suggestions = [
    { icon: <BellRing className="h-4 w-4" />, t: L("आज क्या करना है?", "What should I do today?") },
    { icon: <HandCoins className="h-4 w-4" />, t: L("किसका पैसा बाकी है?", "Who owes me money?") },
    { icon: <Scale className="h-4 w-4" />, t: L("Sharma Traders ने 60 दिन से पैसा नहीं दिया", "Sharma Traders hasn't paid for 60 days") },
    { icon: <Landmark className="h-4 w-4" />, t: L("मेरे लिए कौन सी सरकारी योजना है?", "Which government schemes am I eligible for?") },
    { icon: <BookOpen className="h-4 w-4" />, t: L("नया बिल जोड़ना है", "Add invoice for a new sale") },
  ];

  return (
    <>
      <div className="pane-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {api.turns.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="font-display text-[26px] leading-tight">{L("क्या मदद करूं?", "How can I help?")}</p>
            <p className="mt-1 text-[13.5px] text-ink-2">{L("नीचे छुइए, लिखिए, या माइक दबाकर बोलिए।", "Tap below, type, or press the mic and speak.")}</p>
            <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }} className="mt-4 space-y-2">
              {suggestions.map((s) => (
                <motion.button
                  key={s.t}
                  variants={{ hidden: { opacity: 0, x: 16 }, show: { opacity: 1, x: 0 } }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => api.send(s.t)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left text-[14px] text-ink hover:border-accent/40 hover:bg-accent-soft/40"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunken text-accent">{s.icon}</span>
                  {s.t}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {api.turns.map((t) =>
            t.role === "user" ? (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13.5px] text-white">{t.text}</p>
              </motion.div>
            ) : (
              <motion.div key={t.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>
                <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                  <span className={`h-1.5 w-1.5 rounded-full ${AGENT_META[t.agent].dot}`} />
                  {hi ? AGENT_META[t.agent].hi : AGENT_META[t.agent].en}
                </p>
                <div className="rounded-2xl border border-line bg-surface p-3.5 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.25)]">
                  {api.surfaces[t.surfaceId] ? (
                    <A2UISurface surface={api.surfaces[t.surfaceId]} onAction={(m) => api.act(m.action)} onDataChange={api.setData} />
                  ) : (
                    <p className="text-[12px] text-faint">{L("यह कार्ड अब उपलब्ध नहीं है।", "This surface is no longer available.")}</p>
                  )}
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
        {api.busy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <motion.span key={i} className="h-2 w-2 rounded-full bg-accent/60" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12 }} />
            ))}
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line p-3">
        <div data-tour="saathi" className="flex items-end gap-2 rounded-2xl border border-line-strong bg-surface px-3 py-2.5 transition-colors focus-within:border-accent">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={L("साथी से पूछें…", "Ask Saathi…")}
            className="max-h-28 min-h-[24px] flex-1 resize-none bg-transparent text-[14px] outline-none placeholder:text-faint"
          />
          <motion.button
            data-tour="mic"
            whileTap={{ scale: 0.9 }}
            onClick={voice}
            aria-label="Voice input"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full ${listening ? "bg-danger text-white" : "bg-saffron-soft text-saffron hover:bg-saffron hover:text-white"}`}
          >
            {listening && <motion.span className="absolute inset-0 rounded-full bg-danger" animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1, repeat: Infinity }} />}
            <Mic className="relative h-[18px] w-[18px]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={submit} disabled={!text.trim() || api.busy} aria-label="Send" className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:opacity-30">
            <ArrowUp className="h-[18px] w-[18px]" />
          </motion.button>
        </div>
        <p className="mt-1.5 px-1 text-[10.5px] text-faint">{L("पैसे, तारीख और नियम कोड से गिने जाते हैं। कानूनी सलाह नहीं।", "Money, dates and rules are computed in code. Not legal advice.")}</p>
      </div>
    </>
  );
}
