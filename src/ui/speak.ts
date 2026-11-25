/**
 * Read text aloud in a natural Indian voice.
 * 1) Neural voice from /api/tts (en-IN Neerja / hi-IN Swara), cached per sentence.
 * 2) Fallback: the best Indian voice the browser offers (prefers "Natural"/"Online"/Google voices).
 */
let token = 0;
let current: HTMLAudioElement | null = null;
const cache = new Map<string, string>();

export async function speak(text: string, lang: "hi" | "en", onEnd?: () => void): Promise<boolean> {
  stopSpeaking();
  const my = ++token;
  endCb = onEnd ?? null;
  try {
    const key = `${lang}|${text}`;
    let url = cache.get(key);
    if (!url) {
      const res = await fetch(`/api/tts?lang=${lang}&text=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error("tts");
      url = URL.createObjectURL(await res.blob());
      cache.set(key, url);
    }
    if (my !== token) return false; // cancelled while loading
    const audio = new Audio(url);
    current = audio;
    audio.onended = () => finish(my);
    await audio.play();
    return true;
  } catch {
    if (my !== token) return false;
    return browserSpeak(text, lang, my);
  }
}

let endCb: (() => void) | null = null;
function finish(my: number) {
  if (my !== token) return;
  const cb = endCb;
  endCb = null;
  cb?.();
}

export function stopSpeaking() {
  token++;
  const cb = endCb;
  endCb = null;
  cb?.();
  try {
    current?.pause();
    current = null;
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
}

function pickVoice(lang: "hi" | "en"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const want = lang === "hi" ? "hi-IN" : "en-IN";
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (v.lang === want) s += 100;
    else if (v.lang.startsWith(lang)) s += 40;
    if (/natural|online|neural/i.test(v.name)) s += 30;
    if (/google/i.test(v.name)) s += 20;
    if (/neerja|swara|heera|kalpana|hemant|ravi|madhur|prabhat/i.test(v.name)) s += 10;
    return s;
  };
  return [...voices].sort((a, b) => score(b) - score(a)).find((v) => score(v) >= 40);
}

function browserSpeak(text: string, lang: "hi" | "en", my: number): boolean {
  try {
    const synth = window.speechSynthesis;
    if (!synth) {
      finish(my);
      return false;
    }
    const go = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.onend = () => finish(my);
      u.onerror = () => finish(my);
      u.lang = lang === "hi" ? "hi-IN" : "en-IN";
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = 0.95;
      synth.speak(u);
    };
    if (synth.getVoices().length) go();
    else synth.addEventListener("voiceschanged", go, { once: true });
    return true;
  } catch {
    finish(my);
    return false;
  }
}
