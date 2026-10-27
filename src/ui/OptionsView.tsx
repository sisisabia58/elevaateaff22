import { buildCaptions } from "../shared/captions";
import { marketFromHost } from "../shared/money";
import type { Settings, Tone } from "../shared/types";
import { elevateCss } from "./css";

const SAMPLE = {
  itemId: "1",
  shopId: "1",
  name: "Tumbler Stainless 600ml",
  price: 89000,
  sold: 1240,
  rating: 4.8,
  image: null,
  shopName: null,
  isAd: false,
  url: "https://shopee.co.id/product/1/1",
};

const TONES: Array<{ id: Tone; hint: string }> = [
  { id: "santai", hint: "Nada obrolan" },
  { id: "singkat", hint: "Dua baris" },
  { id: "cerita", hint: "Pengalaman banding" },
];

export function OptionsView({
  settings,
  savedLabel,
  onChange,
}: {
  settings: Settings;
  savedLabel: string | null;
  onChange: (settings: Settings) => void;
}) {
  const preview = buildCaptions(SAMPLE, marketFromHost("shopee.co.id"), settings.tone)[0];
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div className="ea-options">
        <div className="ea-options-card">
          <div className="ea-mark">E</div>
          <h1>Pengaturan Elevate Affiliate</h1>
          <p className="lede">
            Komisi asli dibaca dari sesi Affiliate Shopee kalau kamu sedang login. Angka di bawah dipakai saat sesi itu belum kebaca.
          </p>
          <div className="ea-field">
            <label htmlFor="ea-rate">Komisi default (%)</label>
            <input
              id="ea-rate"
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={settings.defaultRatePct}
              onChange={(event) => onChange({ ...settings, defaultRatePct: Number(event.target.value) })}
            />
            <p>Contoh: 8 berarti estimasi Rp7.120 dari harga Rp89.000.</p>
          </div>
          <div className="ea-field">
            <label>Nada caption yang disalin lebih dulu</label>
            <div className="ea-tones">
              {TONES.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className="ea-mini"
                  aria-pressed={settings.tone === tone.id}
                  onClick={() => onChange({ ...settings, tone: tone.id })}
                  style={
                    settings.tone === tone.id
                      ? { background: "#1c1915", color: "#fffdf9", borderRadius: 999, border: "1px solid #1c1915", padding: "6px 12px" }
                      : { borderRadius: 999, border: "1px solid #e6dfd2", background: "#fff", padding: "6px 12px" }
                  }
                >
                  {tone.hint}
                </button>
              ))}
            </div>
          </div>
          <div className="ea-field">
            <label className="ea-check">
              <input
                type="checkbox"
                checked={settings.showScout}
                onChange={(event) => onChange({ ...settings, showScout: event.target.checked })}
              />
              <span>
                Tampilkan scout di pencarian dan toko
                <p>Kartu di halaman produk tetap muncul.</p>
              </span>
            </label>
          </div>
          <div className="ea-field">
            <label>Pratinjau caption</label>
            <div className="ea-preview">{preview.text}</div>
          </div>
          <div className="ea-saved">{savedLabel ?? ""}</div>
        </div>
      </div>
    </div>
  );
}
