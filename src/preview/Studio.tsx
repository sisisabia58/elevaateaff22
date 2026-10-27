import { useMemo, useState } from "react";
import { buildCaptions } from "../shared/captions";
import { commissionView } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { estimateCommission, marketFromHost } from "../shared/money";
import type { CommissionView, LiveCommission, Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { OptionsView } from "../ui/OptionsView";
import { PopupView } from "../ui/PopupView";
import { ProductCard } from "../ui/ProductCard";
import { ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
import { FEATURED, FIXTURES } from "./fixtures";

type Scene = "search" | "product" | "popup" | "settings";

const SCENES: Array<{ id: Scene; label: string }> = [
  { id: "search", label: "Pencarian" },
  { id: "product", label: "Produk" },
  { id: "popup", label: "Popup" },
  { id: "settings", label: "Pengaturan" },
];

export function Studio() {
  const [scene, setScene] = useState<Scene>("search");
  const [settings, setSettings] = useState<Settings>({ defaultRatePct: 8, tone: "santai", showScout: true });
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [sort, setSort] = useState<ScoutSort>("commission");
  const [empty, setEmpty] = useState(false);
  const [hideDetail, setHideDetail] = useState(false);
  const [live, setLive] = useState<Record<string, LiveCommission>>({});
  const [checkLabel, setCheckLabel] = useState("Cek komisi asli");
  const [linkDetail, setLinkDetail] = useState<string | undefined>(undefined);
  const [popupNote, setPopupNote] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(true);
  const [scoutOpen, setScoutOpen] = useState(true);
  const market = marketFromHost("shopee.co.id");
  const items = empty ? [] : FIXTURES;

  const commissions = useMemo(() => {
    const map: Record<string, CommissionView> = {};
    for (const item of FIXTURES) map[item.itemId] = commissionView(item, settings, live[item.itemId] ?? null);
    return map;
  }, [live, settings]);

  function updateSettings(next: Settings) {
    const rate = Number.isFinite(next.defaultRatePct) ? next.defaultRatePct : settings.defaultRatePct;
    const safe = { ...next, defaultRatePct: Math.min(60, Math.max(0.5, rate)) };
    setSettings(safe);
    setSavedLabel("Tersimpan di pratinjau ini.");
    window.setTimeout(() => setSavedLabel(null), 1400);
  }

  async function simulateLive() {
    setCheckLabel("Membuka sesi affiliate…");
    await wait(400);
    const next: Record<string, LiveCommission> = {};
    FIXTURES.slice(0, 4).forEach((item, index) => {
      const ratePct = [12, 9.5, 7, 15][index] ?? 8;
      next[item.itemId] = {
        ratePct,
        amount: estimateCommission(item.price, ratePct),
        xtraRatePct: index === 0 ? 2 : null,
        promotedLast7d: [18, 6, 2, 11][index] ?? null,
        freeSample: index === 2,
      };
      setCheckLabel(`Cek komisi ${index + 1}/4`);
    });
    await wait(500);
    setLive(next);
    setCheckLabel("Komisi asli · 4 produk");
  }

  const featuredCommission = commissions[FEATURED.itemId];

  return (
    <>
      <header className="studio-top">
        <div>
          <strong>Elevate Affiliate</strong>
          <p>Pratinjau extension. Halaman di bawah bukan Shopee — kartunya yang asli.</p>
        </div>
        <nav className="studio-nav" aria-label="Adegan">
          {SCENES.map((entry) => (
            <button key={entry.id} type="button" aria-pressed={scene === entry.id} onClick={() => setScene(entry.id)}>
              {entry.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="studio-stage">
        <section className="browser" aria-label="Pratinjau halaman">
          {scene !== "settings" && (
            <div className="browser-bar">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <div className="url">
                {scene === "product"
                  ? "shopee.co.id/Tumbler-Stainless-i.88001.2000"
                  : scene === "popup"
                    ? "popup extension"
                    : "shopee.co.id/search?keyword=tumbler"}
              </div>
            </div>
          )}
          {scene === "search" && (
            <div className="page">
              <h2>tumbler</h2>
              <p className="muted">Hasil pencarian demo. Scout membaca kartu yang sudah tampil.</p>
              <div className="grid">
                {FIXTURES.map((item) => (
                  <article key={item.itemId} className="fake-card">
                    <div className="swatch" />
                    <strong>{item.name}</strong>
                    <p className="muted">Rp{item.price.toLocaleString("id-ID")}</p>
                  </article>
                ))}
              </div>
              {settings.showScout && scoutOpen && (
                <ScoutPanel
                  title={`Pencarian · tumbler · ${items.length} produk`}
                  items={items}
                  market={market}
                  commissions={commissions}
                  sort={sort}
                  onSort={setSort}
                  onOpen={() => setScene("product")}
                  onCheckLive={() => void simulateLive()}
                  onExport={() => downloadText("elevate-affiliate-demo.csv", scoutCsv(items, commissions))}
                  checkLabel={checkLabel}
                  onClose={() => setScoutOpen(false)}
                  embedded
                />
              )}
            </div>
          )}
          {scene === "product" && (
            <div className="page">
              <p className="muted">Dapur Kecil</p>
              <h2>{FEATURED.name}</h2>
              <p>Rp{FEATURED.price.toLocaleString("id-ID")} · 1.240 terjual · 4,8★</p>
              <button className="buy" type="button">
                Beli Sekarang
              </button>
              {cardOpen && (
                <ProductCard
                  item={hideDetail ? null : FEATURED}
                  market={market}
                  commission={hideDetail ? null : featuredCommission}
                  captions={buildCaptions(FEATURED, market, settings.tone)}
                  phase={hideDetail ? "error" : "ready"}
                  detail={linkDetail}
                  linkLabel="Salin link affiliate"
                  onCopyLink={() => {
                    void copyText(FEATURED.url).then((ok) =>
                      setLinkDetail(
                        ok
                          ? "Sesi Affiliate belum aktif di pratinjau ini. Yang disalin adalah link produk biasa."
                          : "Clipboard ditolak browser.",
                      ),
                    );
                  }}
                  onCopyCaption={(text) => void copyText(text)}
                  onClose={() => setCardOpen(false)}
                  embedded
                />
              )}
            </div>
          )}
          {scene === "popup" && (
            <div className="popup-frame">
              <PopupView
                kind="product"
                label={FEATURED.name}
                item={FEATURED}
                scoutCount={FIXTURES.length}
                market={market}
                commission={featuredCommission}
                note={popupNote}
                onOpenOptions={() => setScene("settings")}
                onCopyCaption={() => {
                  const caption = buildCaptions(FEATURED, market, settings.tone)[0];
                  void copyText(caption.text).then((ok) => setPopupNote(ok ? "Caption disalin." : "Clipboard ditolak browser."));
                }}
              />
            </div>
          )}
          {scene === "settings" && <OptionsView settings={settings} savedLabel={savedLabel} onChange={updateSettings} />}
        </section>
        <aside className="side-note">
          <h3>Yang bisa dicoba</h3>
          <ul>
            <li>Ubah komisi default, estimasi di pencarian ikut berubah.</li>
            <li>Cek komisi asli mengisi 4 produk pertama, seolah sesi Affiliate sudah login.</li>
            <li>Salin caption dari kartu produk atau popup.</li>
            <li>CSV mengunduh daftar yang sedang tampil.</li>
          </ul>
          <div className="studio-tools">
            <button type="button" onClick={() => { setEmpty(false); setScoutOpen(true); setScene("search"); }}>
              Isi ulang hasil pencarian
            </button>
            <button type="button" onClick={() => { setEmpty(true); setScoutOpen(true); setScene("search"); }}>
              Lihat scout kosong
            </button>
            <button type="button" onClick={() => { setHideDetail((value) => !value); setCardOpen(true); setScene("product"); }}>
              {hideDetail ? "Tampilkan detail produk" : "Lihat produk gagal kebaca"}
            </button>
            <button type="button" onClick={() => { setCardOpen(true); setScene("product"); }}>
              Buka kartu produk
            </button>
          </div>
          <p>Di Chrome, muat folder dist lewat Load unpacked setelah npm run build.</p>
        </aside>
      </main>
    </>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
