import { useEffect, useMemo, useState } from "react";
import { buildCaptions } from "../shared/captions";
import { commissionView } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { formatMoney, formatRate, estimateCommission, marketFromHost } from "../shared/money";
import { EMPTY_ROAS } from "../shared/roas";
import { priceHistogram, shopSummary } from "../shared/research";
import { downloadDataUrl, drawShareCard } from "../shared/share";
import { DEFAULT_SETTINGS, type CommissionView, type LiveCommission, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { OptionsView } from "../ui/OptionsView";
import { PopupView } from "../ui/PopupView";
import { PageActions } from "../ui/PageActions";
import { ProductCard } from "../ui/ProductCard";
import { ProfitBoard } from "../ui/ProfitBoard";
import { RoasCard } from "../ui/RoasCard";
import { ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
import { FEATURED, FIXTURES } from "./fixtures";

type Scene = "search" | "product" | "popup" | "settings" | "iklan" | "profit";

const SCENES: Array<{ id: Scene; label: string }> = [
  { id: "search", label: "Pencarian" },
  { id: "product", label: "Produk" },
  { id: "popup", label: "Popup" },
  { id: "settings", label: "Pengaturan" },
  { id: "iklan", label: "Iklan" },
  { id: "profit", label: "Laba" },
];

export function Studio() {
  const [scene, setScene] = useState<Scene>("search");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [adsOnly, setAdsOnly] = useState(false);
  const [running, setRunning] = useState(false);
  const [taskNote, setTaskNote] = useState<string | undefined>(undefined);
  const [shareUrl, setShareUrl] = useState("");
  const [roas, setRoas] = useState(EMPTY_ROAS);
  const [signedIn, setSignedIn] = useState(false);
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
  const summary = shopSummary(items);
  const histogram = priceHistogram(items);

  useEffect(() => {
    if (scene !== "product" || hideDetail) return;
    const href = drawShareCard({
      name: FEATURED.name,
      price: formatMoney(FEATURED.price, market),
      commission: featuredCommission ? formatMoney(featuredCommission.amount, market) : "—",
      rate: featuredCommission ? formatRate(featuredCommission.ratePct) : "",
      shop: FEATURED.shopName,
    });
    setShareUrl(href);
  }, [scene, hideDetail, featuredCommission, market]);

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
                    : scene === "iklan"
                      ? "seller.shopee.co.id/portal/marketing/pas"
                      : scene === "profit"
                        ? "dashboard laba"
                        : "shopee.co.id/dapurkecil"}
              </div>
            </div>
          )}
          {scene === "search" && (
            <div className="page">
              <h2>tumbler</h2>
              <p className="muted">Hasil toko demo. Scout menempel di atas daftar.</p>
              {settings.showScout && scoutOpen && (
                <ScoutPanel
                  title={`Toko · Dapur Kecil · ${items.length} produk`}
                  items={items}
                  market={market}
                  commissions={commissions}
                  sort={sort}
                  onSort={setSort}
                  onOpen={() => setScene("product")}
                  onCheckLive={() => void simulateLive()}
                  onExport={() => downloadText("elevate-affiliate-demo.csv", scoutCsv(adsOnly ? items.filter((item) => item.isAd) : items, commissions))}
                  checkLabel={checkLabel}
                  onClose={() => setScoutOpen(false)}
                  placement="dock"
                  initialAnalisa
                  summary={summary}
                  histogram={histogram}
                  adsOnly={adsOnly}
                  onAdsOnly={setAdsOnly}
                  running={running}
                  onStop={() => {
                    setRunning(false);
                    setTaskNote("Dihentikan.");
                  }}
                  onDeepen={() => setTaskNote("Shopee menghentikan pendalaman.")}
                  onDeepenOne={(item) => setTaskNote(`Cek stok · ${item.name}`)}
                  onPaginate={() => setTaskNote("Shopee menghentikan pindah halaman.")}
                  onShopAge={() => setTaskNote("Umur toko demo sudah terisi.")}
                  onAffiliate={() => setTaskNote("Cek affiliate butuh sesi Affiliate Shopee.")}
                  onSoldOut={() => setTaskNote("Produk habis dibaca dari katalog toko.")}
                  onCategory={() => setTaskNote("Analisa kategori butuh login Google tim dan kunci Gemini.")}
                  onShopResearch={() => setTaskNote("Riset toko butuh login Google tim dan kunci Gemini.")}
                  taskNote={taskNote}
                />
              )}
              <div className="grid">
                {FIXTURES.map((item) => (
                  <article key={item.itemId} className="fake-card">
                    <div className="swatch" />
                    <strong>{item.name}</strong>
                    <p className="muted">Rp{item.price.toLocaleString("id-ID")}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
          {scene === "product" && (
            <div className="page">
              <p className="muted">Dapur Kecil</p>
              <h2>{FEATURED.name}</h2>
              <p>Rp{FEATURED.price.toLocaleString("id-ID")} · 1.240 terjual · 4,8★</p>
              <div>
                <button className="buy" type="button">
                  Beli Sekarang
                </button>
                <PageActions
                  onAnalisa={() => setCardOpen(true)}
                  onVariant={() => setLinkDetail("Peringkat varian membuka ulasan produk.")}
                  onAi={() => setLinkDetail("Analisa AI butuh login Google tim dan kunci Gemini.")}
                  onThread={() => setLinkDetail("Thread Affiliate butuh login Google tim dan kunci Gemini.")}
                  onImages={() => setLinkDetail("Belum ada gambar. Refresh halaman produk.")}
                />
              </div>
              {shareUrl && !hideDetail && <img className="ea-share" alt="Kartu bagikan 4:5" src={shareUrl} />}
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
                  onShare={() => shareUrl && downloadDataUrl("elevate-share.png", shareUrl)}
                  onZip={() => setLinkDetail("Belum ada gambar. Refresh halaman produk.")}
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
                onOpenDashboard={() => setScene("profit")}
                onCopyCaption={() => {
                  const caption = buildCaptions(FEATURED, market, settings.tone)[0];
                  void copyText(caption.text).then((ok) => setPopupNote(ok ? "Caption disalin." : "Clipboard ditolak browser."));
                }}
              />
            </div>
          )}
          {scene === "settings" && (
            <OptionsView
              settings={settings}
              savedLabel={savedLabel}
              onChange={updateSettings}
              email={signedIn ? "tim@elevate.test" : null}
              authNote={signedIn ? null : "Login Google hanya jalan di dalam extension."}
              onSignIn={() => setSignedIn(true)}
              onSignOut={() => setSignedIn(false)}
            />
          )}
          {scene === "iklan" && (
            <div className="page">
              <h2>Iklan Shopee</h2>
              <p className="muted">Kalkulator tetap jalan kalau tabel iklan tidak ketemu.</p>
              <RoasCard value={roas} onChange={setRoas} spend="20000" onSpend={() => undefined} tableNote="Tabel iklan belum ketemu di halaman ini." />
            </div>
          )}
          {scene === "profit" && (
            <ProfitBoard snapshot={null} hppCount={0} note="Dashboard kosong. Muat contoh ada di tab extension." />
          )}
        </section>
        <aside className="side-note">
          <h3>Yang bisa dicoba</h3>
          <ul>
            <li>Ubah komisi default, estimasi di pencarian ikut berubah.</li>
            <li>Cek komisi asli mengisi 4 produk pertama, seolah sesi Affiliate sudah login.</li>
            <li>Salin caption dari kartu produk atau popup.</li>
            <li>Analisa menempel di pencarian: penjualan 30 hari, trend, sebaran harga, umur listing, dan umur toko.</li>
            <li>Kartu produk menggambar gambar 4:5.</li>
            <li>Iklan menunjukkan zona ROAS. Laba mulai dari keadaan kosong.</li>
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
