import { useEffect, useState } from "react";
import { elevateCss } from "./css";

const FONT_KEY = "aiModalFontSize";
const FONT_MIN = 11;
const FONT_MAX = 20;
const FONT_STEP = 1.5;

function clampFont(value: number): number {
  return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(value * 10) / 10));
}

function rememberFont(size: number) {
  try {
    localStorage.setItem(FONT_KEY, String(size));
  } catch {
    /* private mode */
  }
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    void chrome.storage.local.set({ [FONT_KEY]: size });
  }
}

export type MarketAiPhase = "loading" | "result" | "error" | "nokey";

function AiText({ text }: { text: string }) {
  const blocks: Array<{ type: "p" | "ul" | "ol"; lines: string[] }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^(\d+)[.)]\s+(.*)$/.exec(line);
    const type = bullet ? "ul" : numbered ? "ol" : "p";
    const value = bullet?.[1] ?? numbered?.[2] ?? line;
    const last = blocks[blocks.length - 1];
    if (type !== "p" && last?.type === type) last.lines.push(value);
    else if (value) blocks.push({ type, lines: [value] });
  }
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "ul" || block.type === "ol") {
          const Tag = block.type;
          return (
            <Tag key={index}>
              {block.lines.map((line, lineIndex) => (
                <li key={`${index}-${lineIndex}`}>{rich(line)}</li>
              ))}
            </Tag>
          );
        }
        return <p key={index}>{rich(block.lines[0])}</p>;
      })}
    </>
  );
}

function rich(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => (part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>));
}

export function MarketAiDialog({
  subtitle,
  phase,
  text,
  onClose,
  onRegenerate,
  onOpenSettings,
}: {
  subtitle: string;
  phase: MarketAiPhase;
  text: string;
  onClose: () => void;
  onRegenerate: () => void;
  onOpenSettings: () => void;
}) {
  const [fontSize, setFontSize] = useState(14);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FONT_KEY);
      const stored = raw == null ? NaN : Number(raw);
      if (Number.isFinite(stored)) setFontSize(clampFont(stored));
    } catch {
      /* private mode */
    }
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    void chrome.storage.local.get(FONT_KEY).then((result) => {
      const stored = result?.[FONT_KEY];
      if (typeof stored === "number") setFontSize(clampFont(stored));
    });
  }, []);
  function stepFont(direction: -1 | 1) {
    setFontSize((size) => {
      const next = clampFont(Number((size + direction * FONT_STEP).toFixed(1)));
      rememberFont(next);
      return next;
    });
  }
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div
        className="ea-ai-modal"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <section className="ea-ai-card" role="dialog" aria-labelledby="ea-ai-title">
          <header>
            <div>
              <h2 id="ea-ai-title">Analisa Pasar AI</h2>
              <p>{subtitle || "-"}</p>
            </div>
            <button type="button" onClick={onRegenerate} title="Generate ulang -- panggil AI lagi walau hasilnya udah ada di cache">
              Regenerate
            </button>
            <button type="button" aria-label="Perkecil huruf" onClick={() => stepFont(-1)}>
              A-
            </button>
            <button type="button" aria-label="Perbesar huruf" onClick={() => stepFont(1)}>
              A+
            </button>
            <button type="button" aria-label="Tutup analisa" onClick={onClose}>
              ×
            </button>
          </header>
          <div className="ea-ai-body" style={{ fontSize }}>
            {phase === "loading" && <p className="ea-ai-state">Menganalisa pasar...</p>}
            {phase === "nokey" && (
              <div className="ea-ai-state">
                <p>API key Gemini belum diatur.</p>
                <button type="button" onClick={onOpenSettings}>
                  Buka Dashboard Pengaturan
                </button>
              </div>
            )}
            {phase === "error" && <p className="ea-ai-state">{text || "Gagal memproses analisa AI."}</p>}
            {phase === "result" && <AiText text={text} />}
          </div>
          {phase === "result" && (
            <footer>Dibuat otomatis oleh AI, bisa saja kurang akurat. Selalu cek ulang sebelum dipakai buat keputusan.</footer>
          )}
        </section>
      </div>
    </div>
  );
}
