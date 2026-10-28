import { useEffect, useMemo, useState } from "react";
import { buildCaptions, buttonLabels, isOwnShop, parseThreadParts, THREAD_ANGLES, type AiPanel, type ThreadAngle } from "../shared/captions";
import { commissionView } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { formatMoney, formatRate, estimateCommission, marketFromHost } from "../shared/money";
import { stampAdTable } from "../shared/ad-badges";
import { stampAdColumns } from "../shared/ad-columns";
import { stampPerfMetrics } from "../shared/perf-metrics";
import { classifyPortfolio } from "../shared/funnel";
import { stampPerfCards } from "../shared/perf-badges";
import type { RoasPreset } from "../shared/presets";
import { EMPTY_ROAS } from "../shared/roas";
import type { PerfProduct } from "../shared/research";
import { priceHistogram, shopSummary } from "../shared/research";
import { shopDataBlock, type MarketAiScope } from "../shared/market-brief";
import { dateBasisWarning, hppLines, listPeriods, snapshot, studioLedger, type DateBasis, type ProfitWindow } from "../shared/reports";
import { downloadDataUrl, drawShareCard } from "../shared/share";
import { DEFAULT_SETTINGS, type CommissionView, type LiveCommission, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { OptionsView } from "../ui/OptionsView";
import { PopupView } from "../ui/PopupView";
import { PageActions } from "../ui/PageActions";
import { ProductCard } from "../ui/ProductCard";
import { ProfitBoard } from "../ui/ProfitBoard";
import { FunnelBoard } from "../ui/FunnelBoard";
import { HistoriBoard } from "../ui/HistoriBoard";
import { RoasCard } from "../ui/RoasCard";
import { MarketAiDialog, type MarketAiPhase } from "../ui/MarketAiDialog";
import { ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
import { FEATURED, FIXTURES } from "./fixtures";

type Scene = "search" | "product" | "popup" | "settings" | "iklan" | "performa" | "profit";

const SCENES: Array<{ id: Scene; label: string }> = [
  { id: "search", label: "Pencarian" },
  { id: "product", label: "Produk" },
  { id: "popup", label: "Popup" },
  { id: "settings", label: "Pengaturan" },
  { id: "iklan", label: "Iklan" },
  { id: "performa", label: "Performa" },
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
  const [ops, setOps] = useState(0);
  const [profitPeriod, setProfitPeriod] = useState<string | null>(null);
  const [profitRange, setProfitRange] = useState<ProfitWindow | null>(null);
  const [profitBasis, setProfitBasis] = useState<DateBasis>("created");
  const [profitHpp, setProfitHpp] = useState<Record<string, number>>({ SKU1: 15_000, SKU2: 8_000 });
  const ledger = useMemo(() => studioLedger(), []);
  const [presets, setPresets] = useState<Record<string, RoasPreset>>({
    Tumbler: { ...EMPTY_ROAS, hargaJual: 100_000, hpp: 40_000, productId: "1001" },
    Talenan: { ...EMPTY_ROAS, hargaJual: 77_000, hpp: 20_000 },
  });
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
  const [ownShopPage, setOwnShopPage] = useState(false);
  const [aiPanel, setAiPanel] = useState<AiPanel | null>(null);
  const [scoutOpen, setScoutOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPhase, setAiPhase] = useState<MarketAiPhase>("loading");
  const [aiText, setAiText] = useState("");
  const [aiSubtitle, setAiSubtitle] = useState("-");
  const [aiScope, setAiScope] = useState<MarketAiScope | null>(null);
  const market = marketFromHost("shopee.co.id");

  useEffect(() => {
    if (scene !== "iklan") return;
    const root = document.querySelector(".ad-demo");
    if (root) {
      stampAdTable(root, presets);
      stampAdColumns(root, presets);
      stampPerfMetrics(root, presets, roas.ppnTopupPersen);
    }
  }, [scene, roas, presets]);

  useEffect(() => {
    if (scene !== "performa") return;
    const root = document.querySelector(".perf-demo");
    if (root) stampPerfCards(root, previewFunnel());
  }, [scene]);
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

  function pageLabels() {
    const root = document.querySelector(".page");
    return root ? buttonLabels(root) : [];
  }

  function analysePreview() {
    const own = isOwnShop(pageLabels());
    setCardOpen(true);
    setAiPanel({
      title: own ? "Analisa toko sendiri" : "Analisa kompetitor",
      body: own
        ? "Ulasan halaman ini dikirim sebagai own_shop_review."
        : "Ulasan halaman ini dikirim sebagai competitor_review.",
      owner: own ? "Toko Anda" : null,
      ai: true,
    });
  }

  function openPreviewAi(scope?: MarketAiScope) {
    const list = scope?.items ?? items;
    const filter = scope?.filterLabel;
    const subtitle = `Toko kompetitor — ${list[0]?.shopName || "Dapur Kecil"}${filter ? ` (difilter: ${filter})` : ""}`;
    setAiSubtitle(subtitle);
    setAiOpen(true);
    if (!list.length) {
      setAiPhase("error");
      setAiText('Belum ada data produk buat dianalisa. Coba "Refresh data" dulu.');
      return;
    }
    if (!settings.geminiApiKey.trim()) {
      setAiPhase("nokey");
      setAiText("");
      return;
    }
    setAiPhase("loading");
    window.setTimeout(() => {
      const size = shopDataBlock(list, false, market).match(/Omset 30 hari terakhir: (.+)/)?.[1] ?? "-";
      setAiPhase("result");
      setAiText(
        `**Ringkasan portofolio**\nOmset 30 hari di pratinjau ini ${size}, dari ${list.length} produk.\n\n**Yang menonjol**\n- Listing laris menahan sebagian besar omset.\n- Listing lama yang sepi jadi kandidat refresh.\n\n**Langkah berikut**\n1. Jaga stok produk yang sudah laku.\n2. Segarkan listing yang umurnya lewat 6 bulan tanpa penjualan.`,
      );
    }, 280);
  }

  function threadPreview(angle: ThreadAngle) {
    const label = THREAD_ANGLES.find((entry) => entry.key === angle)?.label ?? angle;
    setCardOpen(true);
    setAiPanel({ title: "Thread Affiliate", body: "Nulis thread..." });
    window.setTimeout(() => {
      setAiPanel({
        title: "Thread Affiliate",
        body: "",
        parts: parseThreadParts(
          `${label}: ${FEATURED.name} menyelesaikan keraguan sebelum checkout.\n===PART===\nLanjutan ${label}. Harga dan ulasan di halaman jadi bahan ceritanya.`,
        ),
        ai: true,
      });
    }, 200);
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
                      : scene === "performa"
                        ? "seller.shopee.co.id/datacenter/product/performance"
                        : scene === "profit"
                          ? "dashboard laba"
                          : "shopee.co.id/dapurkecil"}
              </div>
            </div>
          )}
          {scene === "search" && (
            <div className="page">
              <h2>tumbler</h2>
              <p className="muted">Hasil toko demo. Riset toko menempel di atas daftar.</p>
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
                  marketTitle="Riset toko"
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
                  onMarketAi={() => {
                    const scope = { items, filterLabel: null };
                    setAiScope(scope);
                    openPreviewAi(scope);
                  }}
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
                {!ownShopPage && (
                  <button className="buy" type="button">
                    Beli Sekarang
                  </button>
                )}
                <button type="button" onClick={() => setOwnShopPage((value) => !value)}>
                  {ownShopPage ? "Tampilkan tombol beli" : "Simulasi toko sendiri"}
                </button>
                <PageActions
                  onAnalisa={() => setCardOpen(true)}
                  onVariant={() => setLinkDetail("Peringkat varian membuka ulasan produk.")}
                  onAi={() => analysePreview()}
                  onThread={() => threadPreview("problem_solution")}
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
                  onSummarize={() => analysePreview()}
                  onThread={(angle) => threadPreview(angle)}
                  panel={aiPanel}
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
            <div className="page ad-demo">
              <h2>Iklan Shopee</h2>
              <p className="muted">Badge di tabel, kolom iklan, dan kartu metrik memakai preset produk. Biaya iklan aktual sudah termasuk PPN topup.</p>
              <p className="ea-period">1/10 - 28/10 (GMT+7)</p>
              <div className="line-metrics" data-testid="line-metrics">
                {[
                  ["Iklan Dilihat", "10.000"],
                  ["Jumlah Klik", "500"],
                  ["Pesanan", "25"],
                  ["Penjualan", "Rp1.000.000"],
                  ["Biaya Iklan", "Rp100.000"],
                  ["ROAS", "10,00"],
                ].map(([label, value]) => (
                  <div key={label} className="metric-item">
                    <div className="top">
                      <div className="title">{label}</div>
                    </div>
                    <div className="content">
                      <div className="text">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
              <HistoriBoard productId="__account__" scopeSelector=".ad-demo" />
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Penjualan</th>
                    <th>Produk Terjual</th>
                    <th>Konversi</th>
                    <th>Biaya Iklan</th>
                    <th>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Tumbler Stainless
                      <span>ID Produk: 1001</span>
                    </td>
                    <td>Rp890.000</td>
                    <td>10</td>
                    <td>8</td>
                    <td>Rp50.000</td>
                    <td>16,00</td>
                  </tr>
                  <tr>
                    <td>Talenan Kayu</td>
                    <td>Rp154.000</td>
                    <td>2</td>
                    <td>2</td>
                    <td>Rp80.000</td>
                    <td>1,50</td>
                  </tr>
                  <tr>
                    <td>Gelas Plastik</td>
                    <td>Rp50.000</td>
                    <td>1</td>
                    <td>1</td>
                    <td>Rp10.000</td>
                    <td>5,00</td>
                  </tr>
                </tbody>
              </table>
              <div className="ads-columns" data-testid="ads-columns">
                {["Produk", "Penjualan", "Produk Terjual", "Konversi", "Biaya Iklan", "ROAS"].map((label) => (
                  <div key={label} className="title-label">
                    {label}
                  </div>
                ))}
                {[
                  ["Tumbler Stainless 600ml Tutup Sedotan", "/product/manual/1001", "Rp890.000", "10", "8", "Rp50.000", "16,00"],
                  ["Talenan Kayu Jati Tebal untuk Dapur", "", "Rp154.000", "2", "2", "Rp80.000", "1,50"],
                  ["Gelas Plastik Transparan 500ml Isi 6", "", "Rp50.000", "1", "1", "Rp10.000", "5,00"],
                ].map(([title, href, sales, sold, orders, ads, roasValue]) => (
                  <div key={title} style={{ display: "contents" }}>
                    <div className="info-container">
                      {href ? <a href={href}> </a> : null}
                      <div className="ellipsis-content">{title}</div>
                    </div>
                    {[sales, sold, orders, ads, roasValue].map((value, index) => (
                      <div key={`${title}-${index}`} className="ads-num">
                        <div className="report-format-number">{value}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <RoasCard
                value={roas}
                onChange={setRoas}
                presets={presets}
                onSavePreset={(name, preset) => setPresets((current) => ({ ...current, [name]: preset }))}
                onDeletePreset={(name) =>
                  setPresets((current) => {
                    const next = { ...current };
                    delete next[name];
                    return next;
                  })
                }
                onReplacePresets={setPresets}
                spend="20000"
                onSpend={() => undefined}
                tableNote={null}
              />
            </div>
          )}
          {scene === "performa" && (
            <div className="page">
              <h2>Performa produk</h2>
              <p className="muted">Kelas BCG dari median pengunjung dan konversi. Diagnosis menandai tahap funnel pertama yang di bawah median.</p>
              <div className="perf-demo">
                {PREVIEW_PERF.map((row) => (
                  <div key={row.id} className="product-item__info">
                    <b>{row.name}</b>
                    <span>ID Produk: {row.id}</span>
                  </div>
                ))}
              </div>
              <FunnelBoard rows={previewFunnel()} note="6 produk dari contoh laporan 30 hari." />
            </div>
          )}
          {scene === "profit" && (
            <ProfitBoard
              snapshot={snapshot({
                orders: ledger.orders,
                finance: ledger.finance,
                ads: ledger.ads,
                hppBySku: profitHpp,
                claimed: [],
                operasional: ops,
                period: profitRange?.from && profitRange?.to ? null : profitPeriod,
                range: profitRange?.from && profitRange?.to ? profitRange : null,
                basis: profitBasis,
              })}
              hppCount={Object.keys(profitHpp).length}
              note="Tumbler dibuat 15 Okt, dikonfirmasi 1 Nov, selesai 2 Nov, dana dilepas 5 Nov. Sedotan September, dana dilepas 15 Sep. Iklan hanya 1–28 Oktober."
              onOperasional={setOps}
              periods={listPeriods(ledger.orders, ledger.finance, profitBasis)}
              period={profitPeriod}
              onPeriod={setProfitPeriod}
              range={profitRange}
              onRange={setProfitRange}
              basis={profitBasis}
              onBasis={(next) => {
                setProfitBasis(next);
                const months = listPeriods(ledger.orders, ledger.finance, next);
                if (profitPeriod && !months.includes(profitPeriod)) setProfitPeriod(null);
              }}
              basisWarning={dateBasisWarning(ledger.orders, ledger.finance, profitBasis)}
              lines={hppLines(ledger.orders, profitHpp)}
              onHpp={(sku, value) => setProfitHpp((current) => ({ ...current, [sku]: value }))}
            />
          )}
        </section>
        <aside className="side-note">
          <h3>Yang bisa dicoba</h3>
          <ul>
            <li>Ubah komisi default, estimasi di pencarian ikut berubah.</li>
            <li>Cek komisi asli mengisi 4 produk pertama, seolah sesi Affiliate sudah login.</li>
            <li>Salin caption dari kartu produk atau popup.</li>
            <li>Analisa AI di riset toko membuka modal. Tanpa kunci Gemini, modal minta pengaturan. Dengan kunci demo, modal menampilkan ringkasan lokal.</li>
            <li>Kartu produk menggambar gambar 4:5.</li>
            <li>Iklan memakai preset Tumbler dan Talenan. Gelas Plastik tetap Perlu Setup.</li>
            <li>Performa mengelompokkan Star, Cashcow, Question Mark, dan Dog, lalu menandai bottleneck.</li>
            <li>Laba memakai contoh ekspor keuangan: income bersih, alur dana, periode, dan basis tanggal.</li>
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
            <button
              type="button"
              onClick={() => {
                setSettings((current) => ({ ...current, geminiApiKey: current.geminiApiKey.trim() ? "" : "demo-preview" }));
                setScoutOpen(true);
                setScene("search");
              }}
            >
              {settings.geminiApiKey.trim() ? "Hapus kunci Gemini demo" : "Simulasi kunci Gemini"}
            </button>
          </div>
          <p>Di Chrome, muat folder dist lewat Load unpacked setelah npm run build.</p>
        </aside>
      </main>
      {aiOpen && (
        <MarketAiDialog
          subtitle={aiSubtitle}
          phase={aiPhase}
          text={aiText}
          onClose={() => setAiOpen(false)}
          onRegenerate={() => openPreviewAi(aiScope ?? undefined)}
          onOpenSettings={() => {
            setAiOpen(false);
            setScene("settings");
          }}
        />
      )}
    </>
  );
}

const PREVIEW_PERF: PerfProduct[] = [
  { id: "1001", name: "Tumbler Stainless", sold: 180, growthPct: 40, omzet: 16_020_000, orders: 160, salesPerOrder: 100_125, impressions: 12000, visitors: 900, ctrPct: 7.5, convPct: 3.1, addToCartPct: 8, cartToCheckoutPct: 42, repeatPct: 11 },
  { id: "1002", name: "Set Sedotan", sold: 900, growthPct: 5, omzet: 26_100_000, orders: 840, salesPerOrder: 31_071, impressions: 40000, visitors: 3200, ctrPct: 8, convPct: 4.4, addToCartPct: 11, cartToCheckoutPct: 48, repeatPct: 6 },
  { id: "1003", name: "Talenan Kayu", sold: 8, growthPct: 60, omzet: 1_232_000, orders: 8, salesPerOrder: 154_000, impressions: 2000, visitors: 140, ctrPct: 2.1, convPct: 0.8, addToCartPct: 3, cartToCheckoutPct: 20 },
  { id: "1004", name: "Cangkir Keramik", sold: 12, growthPct: -15, omzet: 576_000, orders: 12, salesPerOrder: 48_000, impressions: 1500, visitors: 90, ctrPct: 1.4, convPct: 0.5, addToCartPct: 2, cartToCheckoutPct: 18 },
  { id: "1005", name: "Lampu Meja", sold: 40, growthPct: 10, omzet: 3_200_000, orders: 36, salesPerOrder: 88_888, impressions: 900, visitors: 80, ctrPct: 9, convPct: 6, addToCartPct: 12, cartToCheckoutPct: 55, repeatPct: 4 },
  { id: "1006", name: "Rak Dinding", sold: 20, growthPct: 2, omzet: 1_800_000, orders: 18, salesPerOrder: 100_000, impressions: 18000, visitors: 2000, ctrPct: 1.2, convPct: 0.4, addToCartPct: 1.5, cartToCheckoutPct: 12 },
];

function previewFunnel() {
  return classifyPortfolio(PREVIEW_PERF).rows;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
