"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Card, PageHeader, type PageProps } from "../App";
import { Badge } from "@/ui/primitives";
import { spring } from "@/ui/motion";
import { fmtInr } from "@/lib/vasooli";

export function Outbox({ api, L, go }: PageProps) {
  const notices = api.workspace.notices;
  const [sel, setSel] = useState<string | null>(null);
  const selected = notices.find((n) => n.id === sel) ?? notices[0];
  const stage = { courtesy: L("प्यार भरी याद", "Friendly reminder"), reminder: L("रिमाइंडर", "Reminder"), "legal-notice": L("कानूनी नोटिस", "Legal notice"), samadhaan: L("समाधान आवेदन", "Samadhaan filing") };
  const status = { draft: { t: L("ड्राफ्ट", "Draft"), tone: "warn" as const }, approved: { t: L("मंज़ूर", "Approved"), tone: "info" as const }, sent: { t: L("भेजा गया", "Sent"), tone: "ok" as const } };

  return (
    <div>
      <PageHeader eyebrow={L("आउटबॉक्स", "Outbox")} title={L("भेजे गए नोटिस", "Your notices")} description={L("हर नोटिस आपकी मंज़ूरी के बाद ही जाता है।", "Every notice goes out only after you approve it.")} />
      {notices.length === 0 ? (
        <Card className="py-14 text-center">
          <p className="font-display text-[30px]">{L("अभी कोई नोटिस नहीं", "No notices yet")}</p>
          <p className="mt-2 text-[14px] text-ink-2">{L("वसूली एजेंट से पहला नोटिस बनवाइए।", "Ask the Vasooli agent to draft your first one.")}</p>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => go("vasooli")} className="mt-5 inline-flex h-11 items-center rounded-full bg-accent px-5 text-[14px] font-semibold text-white">
            {L("वसूली पर जाएं", "Go to Vasooli")}
          </motion.button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <ul className="space-y-2.5">
            {notices.map((n) => (
              <motion.li key={n.id} layout whileHover={{ x: 4 }} transition={spring} onClick={() => setSel(n.id)} className={`flex cursor-pointer items-center gap-3 rounded-[22px] border p-4 ${selected?.id === n.id ? "border-accent/40 bg-white" : "border-black/[0.06] bg-white/70"}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{n.buyer}</p>
                  <p className="text-[12.5px] text-muted">
                    {stage[n.stage]} · {n.lang === "hi" ? "हिंदी" : "English"} · {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <p className="font-display text-[22px]">₹{fmtInr(n.claimInr)}</p>
                <Badge tone={status[n.status].tone} dot>{status[n.status].t}</Badge>
              </motion.li>
            ))}
          </ul>
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring}>
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-display text-[26px] leading-tight">{stage[selected.stage]} — {selected.buyer}</p>
                    {selected.status !== "sent" && (
                      <button onClick={() => api.trigger("recover_invoice", { invoiceId: selected.invoiceId })} className="shrink-0 rounded-full border border-black/10 px-3 py-1.5 text-[13px] font-medium hover:bg-sunken">
                        {L("साथी में खोलें", "Open in Saathi")}
                      </button>
                    )}
                  </div>
                  <pre className="pane-scroll mt-4 max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-canvas p-4 font-sans text-[13.5px] leading-relaxed">{selected.text}</pre>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
