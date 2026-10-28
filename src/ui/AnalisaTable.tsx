import { useMemo, useState } from "react";
import { bucketMeasure, itemBucketIndex, metricHistogram, metricsFor, pageAnalytics, shopAgeBucket, type HistogramDimension, type HistogramY, type ItemMetrics } from "../shared/analytics";
import { analyticsCsv, downloadText } from "../shared/csv";
import { formatMoney, formatRate } from "../shared/money";
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
  const bars = metricHistogram(searched, now, 5, dimension, shopCtimes);
  const maxBar = Math.max(1, ...bars.map((bar) => Math.abs(bucketMeasure(bar, barMetric))));
  const missingShops = new Set(items.filter((item) => (item.shopCtime ?? shopCtimes[item.shopId]) == null).map((item) => item.shopId)).size;
  const ranged =
    bucket === null || !bars.length
      ? searched
      : searched.filter((item) => itemBucketIndex(item, bars, dimension, now, shopCtimes) === bucket);
  const dimensionLabel = dimension === "age" ? "Sebaran umur listing" : dimension === "shopAge" ? "Sebaran umur toko" : "Sebaran harga";
  const ordered = [...ranged].sort((a, b) => {
    const left = sortValue(a);
    const right = sortValue(b);
    const av = left ?? (dir === "desc" ? -Infinity : Infinity);
    const bv = right ?? (dir === "desc" ? -Infinity : Infinity);
    return dir === "desc" ? bv - av : av - bv;
  });

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

  function chooseSort(next: SortKey) {
    if (sort === next) setDir((value) => (value === "desc" ? "asc" : "desc"));
    else {
      setSort(next);
      setDir("desc");
    }
  }

  const head = (key: SortKey, label: string) => (
    <th>
      <button type="button" onClick={() => chooseSort(key)} aria-pressed={sort === key}>
        {label}
        {sort === key ? (dir === "desc" ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    <div className="ea-analisa">
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
              <div className="ea-bars">
                {bars.map((bar, index) => {
                  const measure = bucketMeasure(bar, barMetric);
                  const shown =
                    barMetric === "trendPct"
                      ? `${measure >= 0 ? "+" : ""}${measure.toFixed(0)}%`
                      : barMetric === "omset30d" || barMetric === "omsetPerBulan" || barMetric === "totalOmset"
                        ? formatMoney(measure, market)
                        : Math.round(measure).toLocaleString("id-ID");
                  return (
                    <button
                      key={`${dimension}-${index}`}
                      type="button"
                      className="ea-bar"
                      title={`${bar.label} · ${shown}`}
                      aria-pressed={bucket === index}
                      onClick={() => setBucket((current) => (current === index ? null : index))}
                    >
                      <span style={{ height: `${Math.max(8, (Math.abs(measure) / maxBar) * 72)}px` }} />
                    </button>
                  );
                })}
              </div>
              <div className="ea-bar-labels">
                {bars.map((bar, index) => (
                  <span key={`${dimension}-label-${index}`}>{bar.label}</span>
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
      ) : (
        <div className="ea-analisa-scroll">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                {head("price", "Harga")}
                {head("sold30", "30 hari")}
                {head("omset30", "Omset 30")}
                {head("trend", "Trend")}
                {head("sold", "Per bulan")}
                {head("stockCount", "Stok")}
                {head("stock", "Nilai stok")}
                {head("age", "Usia")}
                {head("rating", "Ulasan")}
                {head("wishlist", "Wishlist")}
                {head("share", "% market")}
                {head("commission", "Komisi")}
                {head("affiliates", "Affiliate")}
                <th>Iklan</th>
                <th>Toko</th>
                <th>Gambar</th>
              </tr>
            </thead>
            <tbody>
              {ordered.slice(0, 80).map((item) => {
                const metric = metrics.get(item.itemId);
                const commission = commissions[item.itemId];
                const shopTime = item.shopCtime ?? shopCtimes[item.shopId] ?? null;
                return (
                  <tr key={item.itemId}>
                    <td>
                      <b>{item.name}</b>
                      <span>
                        {item.soldOut === true ? "Habis" : item.soldOut === false ? "Aktif" : "Stok belum dicek"}
                        {item.ratingCount != null ? ` · ${item.ratingCount} ulasan` : ""}
                        {item.wishlist != null ? ` · ${item.wishlist} wishlist` : ""}
                      </span>
                    </td>
                    <td>{formatMoney(item.price, market)}</td>
                    <td>{blank(metric?.sold30d)}</td>
                    <td>{metric?.omset30d == null ? "—" : formatMoney(metric.omset30d, market)}</td>
                    <td>{metric?.trendPct == null ? "—" : `${metric.trendPct >= 0 ? "+" : ""}${metric.trendPct.toFixed(0)}%`}</td>
                    <td>{blank(metric?.soldPerMonth)} / bln</td>
                    <td>
                      {item.stock == null ? "—" : item.stock.toLocaleString("id-ID")}
                      {onDeepenOne && item.stock == null && (
                        <button className="ea-btn" type="button" disabled={running} onClick={() => onDeepenOne(item)}>
                          Cek stok
                        </button>
                      )}
                    </td>
                    <td>{metric?.stockValue == null ? "—" : formatMoney(metric.stockValue, market)}</td>
                    <td>{metric?.ageDays == null ? "—" : `${Math.round(metric.ageDays)} hr`}</td>
                    <td>
                      {item.rating == null ? "—" : item.rating.toFixed(1)}
                      <span>{item.ratingCount != null ? `${item.ratingCount.toLocaleString("id-ID")} ulasan` : ""}</span>
                    </td>
                    <td>{item.wishlist == null ? "—" : item.wishlist.toLocaleString("id-ID")}</td>
                    <td>
                      {metric?.marketSharePct == null ? "—" : `${metric.marketSharePct.toFixed(1)}%`}
                      <span>{metric?.shopOmzetSharePct == null ? "" : `${metric.shopOmzetSharePct.toFixed(0)}% omzet toko`}</span>
                    </td>
                    <td>
                      {commission ? formatMoney(commission.amount, market) : "—"}
                      <span>
                        {commission ? formatRate(commission.ratePct) : ""}
                        {commission?.freeSample ? " · Sample" : ""}
                      </span>
                    </td>
                    <td>{commission?.promotedLast7d == null ? "—" : commission.promotedLast7d.toLocaleString("id-ID")}</td>
                    <td>{item.isAd ? item.adKeyword || "Slot iklan" : "—"}</td>
                    <td>{shopAgeBucket(shopTime, now) ?? "Umur belum diambil"}</td>
                    <td>
                      <button className="ea-btn" type="button" onClick={() => shareRow(item)}>
                        Bagikan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
