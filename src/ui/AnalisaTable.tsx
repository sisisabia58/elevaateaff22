import { useEffect, useMemo, useState } from "react";
import { axisTicks, bucketMeasure, histogramAxisLabel, itemBucketIndex, metricHistogram, metricsFor, niceMax, pageAnalytics, searchOverview, shopAgeBucket, shopOverview, type HistogramDimension, type HistogramY, type ItemMetrics } from "../shared/analytics";
import { aiFilterLabel, type MarketAiScope } from "../shared/market-brief";
import { analyticsCsv, downloadText } from "../shared/csv";
import { formatAgeShort, formatBigMoney, formatMoney, formatRate, formatRibuShort, formatShortMoney } from "../shared/money";
import { downloadDataUrl, drawShareCard } from "../shared/share";
import type { CommissionView, Market, ScoutItem } from "../shared/types";

type SortKey = "sold30" | "omset30" | "trend" | "price" | "sold" | "commission" | "stock" | "age" | "rating" | "wishlist" | "stockCount" | "share" | "affiliates";
type StockFilter = "all" | "aktif" | "habis" | "unknown";
type SampleFilter = "all" | "ya" | "tidak";

function blank(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return digits ? value.toFixed(digits) : Math.round(value).toLocaleString("id-ID");
}

function metricNumber(metrics: ItemMetrics | undefined, key: SortKey, commission: number): number | null {
  if (!metrics) return null;
  if (key === "sold30") return metrics.sold30d;
  if (key === "omset30") return metrics.omset30d;
  if (key === "trend") return metrics.trendPct;
  if (key === "sold") return null;
  if (key === "commission") return commission;
  if (key === "stock") return metrics.stockValue;
  if (key === "age") return metrics.ageDays;
  if (key === "share") return metrics.marketSharePct;
  return null;
}

function statDelta(current: number | null, base: number | null) {
  if (current == null || base == null || base <= 0) return null;
  const pct = ((current - base) / base) * 100;
  const up = pct >= 0;
  return (
    <em className={up ? "up" : "down"}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </em>
  );
}

function SearchStats({ items, market, now }: { items: ScoutItem[]; market: Market; now: number }) {
  const overview = searchOverview(items, now);
  const price =
    overview.priceMin != null && overview.priceMax != null
      ? `${formatShortMoney(overview.priceMin, market)}–${formatShortMoney(overview.priceMax, market)}`
      : "-";
  const age =
    overview.ageMinDays != null && overview.ageMaxDays != null
      ? `${formatAgeShort(overview.ageMinDays, market)}–${formatAgeShort(overview.ageMaxDays, market)}`
      : "-";
  const trend = overview.trendPct == null ? "-" : `${overview.trendPct >= 0 ? "+" : ""}${overview.trendPct}%`;
  return (
    <div className="ea-mkt-stats">
      <div>
        <span>Market size</span>
        <strong>{overview.marketSize == null ? "-" : formatBigMoney(overview.marketSize, market)}</strong>
      </div>
      <div>
        <span>Rentang harga</span>
        <strong>{price}</strong>
      </div>
      <div>
        <span>Rentang umur listing</span>
        <strong>{age}</strong>
      </div>
      <div>
        <span title="Rata-rata trend 30 hari terakhir">Trend</span>
        <strong>{trend}</strong>
      </div>
    </div>
  );
}

function ShopStats({ items, market, now }: { items: ScoutItem[]; market: Market; now: number }) {
  const overview = shopOverview(items, now);
  const price =
    overview.priceMin != null && overview.priceMax != null
      ? `${formatShortMoney(overview.priceMin, market)}–${formatShortMoney(overview.priceMax, market)}`
      : "-";
  return (
    <div className="ea-mkt-stats">
      <div>
        <span>Estimasi omset/bln</span>
        <strong>{overview.omsetPerBulan == null ? "-" : formatBigMoney(overview.omsetPerBulan, market)}</strong>
      </div>
      <div>
        <span>Omset 30 hari terakhir</span>
        <strong>
          {overview.omset30d == null ? "-" : formatBigMoney(overview.omset30d, market)}
          {statDelta(overview.omset30d, overview.omsetPerBulan)}
        </strong>
      </div>
      <div>
        <span>Rentang harga</span>
        <strong>{price}</strong>
      </div>
      <div>
        <span>Penjualan 30 hari terakhir</span>
        <strong>
          {overview.sold30d == null ? "-" : `${Math.round(overview.sold30d).toLocaleString("id-ID")} terjual`}
          {statDelta(overview.sold30d, overview.soldPerMonth)}
        </strong>
      </div>
    </div>
  );
}

export function AnalisaTable({
  items,
  market,
  commissions,
  shopCtimes = {},
  relation = null,
  running = false,
  taskNote,
  onStop,
  onShopAge,
  onDeepen,
  onDeepenOne,
  onAffiliate,
  onSoldOut,
  onCategory,
  onShopResearch,
  onAiScope,
  surface,
}: {
  items: ScoutItem[];
  market: Market;
  commissions: Record<string, CommissionView>;
  shopCtimes?: Record<string, number>;
  relation?: "Toko sendiri" | "Toko kompetitor" | null;
  running?: boolean;
  taskNote?: string;
  onStop?: () => void;
  onShopAge?: () => void;
  onDeepen?: () => void;
  onDeepenOne?: (item: ScoutItem) => void;
  onAffiliate?: () => void;
  onSoldOut?: () => void;
  onCategory?: () => void;
  onShopResearch?: () => void;
  onAiScope?: (scope: MarketAiScope) => void;
  surface?: "search" | "shop";
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("sold30");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const [stock, setStock] = useState<StockFilter>("all");
  const [sample, setSample] = useState<SampleFilter>("all");
  const [adsOnly, setAdsOnly] = useState(false);
  const [barMetric, setBarMetric] = useState<HistogramY>("count");
  const [dimension, setDimension] = useState<HistogramDimension>("price");
  const [bucket, setBucket] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const now = Date.now();
  const metrics = useMemo(() => metricsFor(items, now), [items, now]);
  const summary = useMemo(() => pageAnalytics(items, now), [items, now]);
  const searched = items.filter((item) => {
    const haystack = `${item.name} ${item.shopName ?? ""}`.toLowerCase();
    if (query && !haystack.includes(query.trim().toLowerCase())) return false;
    if (adsOnly && !item.isAd) return false;
    if (stock === "aktif" && item.soldOut !== false) return false;
    if (stock === "habis" && item.soldOut !== true) return false;
    if (stock === "unknown" && item.soldOut != null) return false;
    const free = commissions[item.itemId]?.freeSample;
    if (sample === "ya" && free !== true) return false;
    if (sample === "tidak" && free !== false) return false;
    return true;
  });
  const bars = metricHistogram(searched, now, 6, dimension, shopCtimes);
  const scale = niceMax(Math.max(0, ...bars.map((bar) => bucketMeasure(bar, barMetric))));
  const ticks = axisTicks(scale);
  const missingShops = new Set(items.filter((item) => (item.shopCtime ?? shopCtimes[item.shopId]) == null).map((item) => item.shopId)).size;
  const ranged =
    bucket === null || !bars.length
      ? searched
      : searched.filter((item) => itemBucketIndex(item, bars, dimension, now, shopCtimes) === bucket);
  const dimensionLabel = dimension === "age" ? "Sebaran umur listing" : dimension === "shopAge" ? "Sebaran umur toko" : "Sebaran harga";
  const filterLabel = bucket != null && bars[bucket] ? aiFilterLabel(bars[bucket], dimension, market) : null;
  const selectedBar = bucket != null ? bars[bucket] : undefined;
  const rangeCaption = selectedBar
    ? dimension === "shopAge"
      ? selectedBar.label
      : dimension === "age"
        ? `${formatAgeShort(selectedBar.min, market)}–${formatAgeShort(selectedBar.max, market)}`
        : `${formatShortMoney(selectedBar.min, market).replace(market.symbol, "").trim()}–${formatShortMoney(selectedBar.max, market).replace(market.symbol, "").trim()}`
    : null;
  const scopedItems = bucket == null ? items : ranged;
  const scopeKey = `${filterLabel ?? ""}|${scopedItems.map((item) => item.itemId).join(",")}`;
  useEffect(() => {
    onAiScope?.({ items: scopedItems, filterLabel });
  }, [scopeKey]);
  const ordered = [...ranged].sort((a, b) => {
    const left = sortValue(a);
    const right = sortValue(b);
    const av = left ?? (dir === "desc" ? -Infinity : Infinity);
    const bv = right ?? (dir === "desc" ? -Infinity : Infinity);
    return dir === "desc" ? bv - av : av - bv;
  });
  const shopTotal = new Set(ordered.map((item) => item.shopId || item.shopName).filter(Boolean)).size;

  function axisLabel(bar: { label: string; min: number; max: number }): string {
    if (dimension === "shopAge") return bar.label;
    if (dimension === "age") return `${formatAgeShort(bar.min, market)}–${formatAgeShort(bar.max, market)}`;
    return `${formatRibuShort(bar.min, market)}–${formatRibuShort(bar.max, market)}`;
  }

  function sortValue(item: ScoutItem): number | null {
    if (sort === "price") return item.price;
    if (sort === "sold") return metrics.get(item.itemId)?.soldPerMonth ?? item.sold;
    if (sort === "rating") return item.rating;
    if (sort === "wishlist") return item.wishlist ?? null;
    if (sort === "stockCount") return item.stock ?? null;
    if (sort === "affiliates") return commissions[item.itemId]?.promotedLast7d ?? null;
    return metricNumber(metrics.get(item.itemId), sort, commissions[item.itemId]?.amount ?? 0);
  }

  function shareRow(item: ScoutItem) {
    const commission = commissions[item.itemId];
    const href = drawShareCard({
      name: item.name,
      price: formatMoney(item.price, market),
      commission: commission ? formatMoney(commission.amount, market) : "—",
      rate: commission ? formatRate(commission.ratePct) : "",
      shop: item.shopName,
      affiliates: commission?.promotedLast7d != null ? `${commission.promotedLast7d} affiliate / 7 hari` : null,
    });
    if (href) downloadDataUrl(`elevate-${item.itemId}.png`, href);
  }

  function line(key: SortKey | null, label: string, value: string) {
    return (
      <tr>
        <td className={key && sort === key ? "on" : undefined}>{label}</td>
        <td>{value}</td>
      </tr>
    );
  }

  return (
    <div className="ea-analisa">
      {surface === "search" && <SearchStats items={items} market={market} now={now} />}
      {surface === "shop" && <ShopStats items={items} market={market} now={now} />}
      {!surface && (
      <div className="ea-summary">
        <div>
          <strong>{summary.count}</strong>
          <span>produk</span>
        </div>
        <div>
          <strong>{summary.totalSold.toLocaleString("id-ID")}</strong>
          <span>total terjual</span>
        </div>
        <div>
          <strong>{formatMoney(summary.averagePrice, market)}</strong>
          <span>harga rata-rata</span>
        </div>
        <div>
          <strong>{summary.averageTrend === null ? "—" : `${summary.averageTrend.toFixed(0)}%`}</strong>
          <span>rata-rata trend</span>
        </div>
        <div>
          <strong>{summary.averageSoldPerMonth === null ? "—" : blank(summary.averageSoldPerMonth)}</strong>
          <span>terjual/bulan</span>
        </div>
        <div>
          <strong>{summary.adCount}</strong>
          <span>slot iklan</span>
        </div>
        {relation && (
          <div>
            <strong>{relation}</strong>
            <span>jenis toko</span>
          </div>
        )}
      </div>
      )}
      {searched.length > 0 && (
        <div className="ea-body">
          <div className="ea-kicker">{dimensionLabel}</div>
          <div className="ea-sort">
            <button
              type="button"
              aria-pressed={dimension === "price"}
              onClick={() => {
                setDimension("price");
                setBucket(null);
              }}
            >
              Harga
            </button>
            <button
              type="button"
              aria-pressed={dimension === "age"}
              onClick={() => {
                setDimension("age");
                setBucket(null);
              }}
            >
              Umur listing
            </button>
            <button
              type="button"
              aria-pressed={dimension === "shopAge"}
              onClick={() => {
                setDimension("shopAge");
                setBucket(null);
              }}
            >
              Umur toko
            </button>
            <select value={barMetric} aria-label="Tampilkan menurut" onChange={(event) => setBarMetric(event.target.value as HistogramY)}>
              <option value="count">Jumlah produk</option>
              <option value="sold30d">Penjualan 30 hari</option>
              <option value="omset30d">Omset 30 hari</option>
              <option value="omsetPerBulan">Omset/bulan</option>
              <option value="totalSold">Total terjual</option>
              <option value="totalOmset">Total omset</option>
              <option value="wishlist">Wishlist</option>
              <option value="trendPct">Trend 30 hari</option>
            </select>
          </div>
          {bars.length > 0 ? (
            <>
              <div className="ea-chart-plot">
                <div className="ea-gridlines" aria-hidden="true">
                  {ticks.map((tick) => (
                    <div key={tick} className="ea-gridline">
                      <span>{histogramAxisLabel(barMetric, tick, market)}</span>
                    </div>
                  ))}
                </div>
                <div className="ea-bars">
                  {bars.map((bar, index) => {
                    const measure = bucketMeasure(bar, barMetric);
                    const axis = axisLabel(bar);
                    const shown =
                      barMetric === "trendPct"
                        ? `${measure >= 0 ? "+" : ""}${measure.toFixed(0)}%`
                        : barMetric === "omset30d" || barMetric === "omsetPerBulan" || barMetric === "totalOmset"
                          ? formatMoney(measure, market)
                          : Math.round(measure).toLocaleString("id-ID");
                    const height = measure > 0 ? Math.max((measure / scale) * 100, 2) : 0;
                    return (
                      <button
                        key={`${dimension}-${index}`}
                        type="button"
                        className="ea-bar"
                        title={`${axis} · ${shown}`}
                        aria-pressed={bucket === index}
                        onClick={() => setBucket((current) => (current === index ? null : index))}
                      >
                        <span style={{ height: `${height}%` }} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="ea-bar-labels">
                {bars.map((bar, index) => (
                  <span key={`${dimension}-label-${index}`}>{axisLabel(bar)}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="ea-note">
              {dimension === "shopAge" ? "Umur toko belum diambil." : "Usia listing belum terbaca."}
            </p>
          )}
        </div>
      )}
      <div className="ea-scout-tools">
        <input
          type="text"
          placeholder="Cari nama produk atau toko"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Cari produk"
        />
        <select value={stock} onChange={(event) => setStock(event.target.value as StockFilter)} aria-label="Status stok">
          <option value="all">Semua stok</option>
          <option value="aktif">Aktif</option>
          <option value="habis">Habis</option>
          <option value="unknown">Belum dicek</option>
        </select>
        <select value={sample} onChange={(event) => setSample(event.target.value as SampleFilter)} aria-label="Sample gratis">
          <option value="all">Semua sample</option>
          <option value="ya">Sample gratis</option>
          <option value="tidak">Tanpa sample</option>
        </select>
        <button type="button" className="ea-btn" aria-pressed={adsOnly} onClick={() => setAdsOnly((value) => !value)}>
          {adsOnly ? "Semua iklan" : "Iklan saja"}
        </button>
        <select
          value={sort}
          aria-label="Urutkan analisa"
          onChange={(event) => {
            setSort(event.target.value as SortKey);
            setDir("desc");
          }}
        >
          <option value="sold30">Urut: Penjualan 30 hari</option>
          <option value="omset30">Urut: Omset 30 hari</option>
          <option value="trend">Urut: Trend</option>
          <option value="price">Urut: Harga</option>
          <option value="sold">Urut: Terjual/bulan</option>
          <option value="commission">Urut: Komisi</option>
          <option value="stock">Urut: Nilai stok</option>
          <option value="stockCount">Urut: Stok</option>
          <option value="age">Urut: Usia listing</option>
          <option value="rating">Urut: Ulasan</option>
          <option value="wishlist">Urut: Wishlist</option>
          <option value="share">Urut: Pangsa pasar</option>
          <option value="affiliates">Urut: Affiliate</option>
        </select>
        <button className="ea-btn" type="button" onClick={() => setDir((value) => (value === "desc" ? "asc" : "desc"))}>
          {dir === "desc" ? "↓ Turun" : "↑ Naik"}
        </button>
      </div>
      <div className="ea-scout-tools">
        {running && onStop ? (
          <button className="ea-btn" type="button" onClick={onStop}>
            Stop
          </button>
        ) : (
          <>
            {onShopAge && (
              <button className="ea-btn" type="button" onClick={onShopAge} disabled={missingShops === 0}>
                {missingShops ? `Ambil umur toko (${missingShops})` : "Umur toko sudah ada"}
              </button>
            )}
            {onDeepen && (
              <button className="ea-btn" type="button" onClick={onDeepen}>
                Cek stok semua
              </button>
            )}
            {onAffiliate && (
              <button className="ea-btn" type="button" onClick={onAffiliate}>
                Cek affiliate
              </button>
            )}
            {onSoldOut && (
              <button className="ea-btn" type="button" onClick={onSoldOut}>
                Produk habis
              </button>
            )}
          </>
        )}
        <button
          className="ea-btn"
          type="button"
          onClick={() => downloadText("elevate-analisa.csv", analyticsCsv(ordered, commissions, shopCtimes, now))}
        >
          CSV
        </button>
        {onCategory && (
          <button className="ea-btn" type="button" onClick={onCategory}>
            Analisa kategori
          </button>
        )}
        {onShopResearch && (
          <button className="ea-btn" type="button" onClick={onShopResearch}>
            Riset toko
          </button>
        )}
      </div>
      {taskNote && <p className="ea-note" style={{ padding: "0 14px" }}>{taskNote}</p>}
      {ordered.length === 0 ? (
        <div className="ea-body">
          <div className="ea-empty">
            <strong>Tidak ada produk di filter ini.</strong>
            Ubah pencarian atau tunggu Shopee memuat daftarnya.
          </div>
        </div>
      ) : surface ? (
        <>
          <div className="ea-mini-tools">
            <p>
              {rangeCaption ? (
                <>
                  {ordered.length} produk di rentang <b>{rangeCaption}</b>{" "}
                  <button className="ea-mini-reset" type="button" onClick={() => setBucket(null)}>
                    reset
                  </button>
                </>
              ) : (
                `${ordered.length} produk`
              )}
            </p>
            <button
              className="ea-btn"
              type="button"
              title={
                rangeCaption
                  ? `Buka analisa detail lengkap — cuma ${ordered.length} produk di rentang "${rangeCaption}" yang lagi difilter (omset, trend, wishlist, dst), bisa dicari & diurutkan`
                  : "Buka analisa detail lengkap — semua produk dalam kartu penuh (omset, trend, wishlist, dst), bisa dicari & diurutkan"
              }
              onClick={() => setDetailOpen(true)}
            >
              Analisa Detail
            </button>
          </div>
          <div className="ea-mini-grid">
            {ordered.slice(0, 120).map((item) => {
              const hi = highlight(item);
              const picture = thumb(item);
              return (
                <a key={item.itemId} className="ea-mini-card" href={item.url} target="_blank" rel="noreferrer" title="Klik buat buka halaman produk">
                  <div className="ea-mini-thumb">{picture ? <img src={picture} alt="" /> : <span>Gambar</span>}</div>
                  <div className="ea-mini-name">{clip(item.name, 46)}</div>
                  <div className="ea-mini-shop">{clip(item.shopName || "Toko", 24)}</div>
                  <div className="ea-mini-hi">
                    {hi.label}: {hi.value}
                  </div>
                  <div className="ea-mini-price">{formatMoney(item.price, market)}</div>
                  {item.stock != null && <div className="ea-mini-deep">Data diperdalam</div>}
                </a>
              );
            })}
          </div>
          {ordered.length > 120 && (
            <p className="ea-note" style={{ padding: "0 14px 12px" }}>
              Menampilkan 120 dari {ordered.length} produk — ganti urutan buat lihat produk lain.
            </p>
          )}
        </>
      ) : (
        <div className="ea-market-list">{detailCards(ordered.slice(0, 80))}</div>
      )}
      {detailOpen && (
        <div
          className="ea-detail-modal"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDetailOpen(false);
          }}
        >
          <section className="ea-detail-card" role="dialog" aria-labelledby="ea-detail-title">
            <header>
              <div>
                <h2 id="ea-detail-title">Analisa Detail</h2>
                <p>{surface === "shop" ? `${ordered.length} produk` : `${ordered.length} produk dari ${shopTotal} toko`}</p>
              </div>
              <button type="button" aria-label="Tutup analisa detail" onClick={() => setDetailOpen(false)}>
                ×
              </button>
            </header>
            <div className="ea-detail-body">
              <div className="ea-market-list">{detailCards(ordered.slice(0, 150))}</div>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  function thumb(item: ScoutItem) {
    if (!item.image) return null;
    return /^https?:\/\//.test(item.image) ? item.image : `https://down-id.img.susercontent.com/${item.image}_tn`;
  }

  function highlight(item: ScoutItem): { label: string; value: string } {
    const metric = metrics.get(item.itemId);
    const commission = commissions[item.itemId];
    if (sort === "omset30") return { label: "Omset 30 hari", value: metric?.omset30d == null ? "-" : formatMoney(metric.omset30d, market) };
    if (sort === "trend") return { label: "Trend 30 hari", value: metric?.trendPct == null ? "-" : `${metric.trendPct >= 0 ? "+" : ""}${metric.trendPct.toFixed(0)}%` };
    if (sort === "price") return { label: "Harga", value: formatMoney(item.price, market) };
    if (sort === "sold") return { label: "Terjual/Bulan (rata-rata)", value: metric?.soldPerMonth == null ? "-" : `~${Math.round(metric.soldPerMonth)}` };
    if (sort === "commission") return { label: "Est. Besar Komisi", value: commission ? formatMoney(commission.amount, market) : "-" };
    if (sort === "stock") return { label: "Estimasi nilai stok", value: metric?.stockValue == null ? "-" : formatMoney(metric.stockValue, market) };
    if (sort === "stockCount") return { label: "Stok", value: item.stock == null ? "-" : item.stock.toLocaleString("id-ID") };
    if (sort === "age") return { label: "Usia Listing", value: metric?.ageDays == null ? "-" : formatAgeShort(metric.ageDays, market) };
    if (sort === "rating") return { label: "Nilai Ulasan", value: item.rating == null ? "-" : item.rating.toFixed(1) };
    if (sort === "wishlist") return { label: "Wishlist", value: item.wishlist == null ? "-" : item.wishlist.toLocaleString("id-ID") };
    if (sort === "share") return { label: surface === "shop" ? "% dari omset toko" : "% dari Market Size", value: metric?.marketSharePct == null ? "-" : `${metric.marketSharePct.toFixed(1)}%` };
    if (sort === "affiliates") return { label: "Jumlah Affiliator", value: commission?.promotedLast7d == null ? "-" : commission.promotedLast7d.toLocaleString("id-ID") };
    return { label: "Penjualan 30 hari", value: blank(metric?.sold30d) };
  }

  function detailCards(list: ScoutItem[]) {
    return list.map((item) => {
            const metric = metrics.get(item.itemId);
            const commission = commissions[item.itemId];
            const shopTime = item.shopCtime ?? shopCtimes[item.shopId] ?? null;
            const added = item.ctime ? new Date(item.ctime * 1000).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : null;
            const hot = (item.sold ?? 0) >= 1000 && item.stock == null;
            const picture = thumb(item);
            return (
              <article key={item.itemId} className="ea-market-card">
                <a className="ea-market-head" href={item.url} target="_blank" rel="noreferrer">
                  <div className="ea-market-thumb">{picture ? <img src={picture} alt="" /> : <span>Gambar</span>}</div>
                  <div>
                    <b>{item.name}</b>
                    <span className="meta">
                      {item.soldOut === true && <em className="ea-pill habis">Habis</em>}
                      {item.soldOut === false && <em className="ea-pill aktif">Aktif</em>}
                      {item.isAd && <em className="ea-pill iklan">{item.adKeyword || "Iklan"}</em>}
                      {hot && <em className="ea-pill iklan">Perlu diperdalam</em>}
                      {item.stock != null && <em className="ea-pill aktif">Data stok</em>}
                    </span>
                    <span className="meta">
                      {item.shopName || "Toko"}
                      {added ? ` · ditambahkan ${added}` : ""}
                      {shopAgeBucket(shopTime, now) ? ` · toko ${shopAgeBucket(shopTime, now)}` : ""}
                    </span>
                  </div>
                </a>
                <div className="ea-market-row">
                  <span>
                    Harga <strong>{formatMoney(item.price, market)}</strong>
                  </span>
                  <span>
                    Stok{" "}
                    {item.stock == null ? (
                      onDeepenOne ? (
                        <button className="ea-btn" type="button" disabled={running} onClick={() => onDeepenOne(item)}>
                          Cek stok
                        </button>
                      ) : (
                        "—"
                      )
                    ) : (
                      <strong>{item.stock.toLocaleString("id-ID")}</strong>
                    )}
                  </span>
                </div>
                <div className="ea-market-section">Trend</div>
                <table>
                  <tbody>
                    {line("sold", "Terjual/bulan", blank(metric?.soldPerMonth))}
                    {line(null, "Omset/bulan", metric?.omsetPerBulan == null ? "—" : formatMoney(metric.omsetPerBulan, market))}
                    {line("sold30", "Penjualan 30 hari", blank(metric?.sold30d))}
                    {line("omset30", "Omset 30 hari", metric?.omset30d == null ? "—" : formatMoney(metric.omset30d, market))}
                    {line("trend", "Trend 30 hari", metric?.trendPct == null ? "—" : `${metric.trendPct >= 0 ? "+" : ""}${metric.trendPct.toFixed(0)}%`)}
                    {line("age", "Usia listing", metric?.ageDays == null ? "—" : `${Math.round(metric.ageDays)} hr`)}
                  </tbody>
                </table>
                <div className="ea-market-section">Potensi dan performa</div>
                <table>
                  <tbody>
                    {line("rating", "Nilai ulasan", item.rating == null ? "—" : `${item.rating.toFixed(1)}${item.ratingCount != null ? ` (${item.ratingCount.toLocaleString("id-ID")})` : ""}`)}
                    {line("wishlist", "Wishlist", item.wishlist == null ? "—" : item.wishlist.toLocaleString("id-ID"))}
                    {line("share", "Pangsa pasar", metric?.marketSharePct == null ? "—" : `${metric.marketSharePct.toFixed(1)}%`)}
                    {line("stock", "Estimasi nilai stok", metric?.stockValue == null ? "—" : formatMoney(metric.stockValue, market))}
                  </tbody>
                </table>
                <div className="ea-market-section">Statistik total</div>
                <table>
                  <tbody>
                    {line(null, "Total terjual", blank(item.sold))}
                    {line(null, "Total omset", metric?.totalOmset == null ? "—" : formatMoney(metric.totalOmset, market))}
                    {line(null, "Umur toko", shopAgeBucket(shopTime, now) ?? "belum diambil")}
                  </tbody>
                </table>
                <div className="ea-market-section">Komisi</div>
                <table>
                  <tbody>
                    {line("commission", "Est. besar komisi", commission ? formatMoney(commission.amount, market) : "—")}
                    {line(null, "Est. rate", commission ? formatRate(commission.ratePct) : "—")}
                    {line("affiliates", "Affiliate 7 hari", commission?.promotedLast7d == null ? "—" : commission.promotedLast7d.toLocaleString("id-ID"))}
                    {line(null, "Sample gratis", commission?.freeSample == null ? "—" : commission.freeSample ? "Ya" : "Tidak")}
                  </tbody>
                </table>
                <div className="ea-actions">
                  <button className="ea-btn" type="button" onClick={() => shareRow(item)}>
                    Bagikan
                  </button>
                </div>
              </article>
            );
    });
  }
}

function clip(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
