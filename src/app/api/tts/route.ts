import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

/**
 * Natural Indian-accent speech for read-aloud (tour tips, landing intro).
 * GET /api/tts?lang=hi|en&text=...  → audio/mpeg
 * Uses Microsoft Edge neural voices (en-IN Neerja, hi-IN Swara). The client
 * falls back to the browser's own voices if this is unavailable.
 */
const VOICES = { en: "en-IN-NeerjaNeural", hi: "hi-IN-SwaraNeural" } as const;

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const text = (searchParams.get("text") ?? "").trim().slice(0, 600);
  const lang = searchParams.get("lang") === "hi" ? "hi" : "en";
  if (!text) return new Response("text is required", { status: 400 });

  const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 15000 });
  try {
    await tts.setMetadata(VOICES[lang], OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), { rate: "-3%" });
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (c: Buffer) => chunks.push(c));
      audioStream.on("end", () => resolve());
      audioStream.on("close", () => resolve());
      audioStream.on("error", reject);
    });
    if (!chunks.length) throw new Error("empty audio");
    return new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=604800" },
    });
  } catch {
    return new Response("tts unavailable", { status: 502 });
  } finally {
    tts.close();
  }
}
