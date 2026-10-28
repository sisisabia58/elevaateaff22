import { useState } from "react";
import { formatMoney, formatRate } from "../shared/money";
import type { HistogramBucket, ShopSummary } from "../shared/research";
import type { CommissionView, Market, ScoutItem } from "../shared/types";
import { AnalisaTable } from "./AnalisaTable";
import { elevateCss } from "./css";

export type ScoutSort = "commission" | "sold" | "price";

const SORTS: Array<{ id: ScoutSort; label: string }> = [
  { id: "commission", label: "Komisi" },
  { id: "sold", label: "Terjual" },
  { id: "price", label: "Harga" },
];

export function sortScout(items: ScoutItem[], commissions: Record<string, CommissionView>, sort: ScoutSort): ScoutItem[] {
  const list = [...items];
  list.sort((a, b) => {
    if (sort === "sold") return (b.sold ?? -1) - (a.sold ?? -1);
    if (sort === "price") return b.price - a.price;
    return (commissions[b.itemId]?.amount ?? 0) - (commissions[a.itemId]?.amount ?? 0);
  });
  return list;
}

export function ScoutPanel({
  title,
  items,
  market,
  commissions,
  sort,
  onSort,
  onOpen,
  onCheckLive,
  onExport,
  checkLabel,
  onClose,
  embedded = false,
  placement = "float",
  summary = null,
  histogram = [],
  adsOnly = false,
  onAdsOnly,
  running = false,
  onStop,
  onDeepen,
  onDeepenOne,
  onPaginate,
  onShopNote,
  taskNote,
  initialAnalisa = false,
  shopCtimes,
  relation = null,
  onShopAge,
  onAffiliate,
  onSoldOut,
  onCategory,
  onShopResearch,
}: {
  title: string;
  items: ScoutItem[];
  market: Market;
  commissions: Record<string, CommissionView>;
  sort: ScoutSort;
  onSort: (sort: ScoutSort) => void;
  onOpen: (item: ScoutItem) => void;
  onCheckLive: () => void;
  onExport: () => void;
  checkLabel: string;
  onClose: () => void;
  embedded?: boolean;
  placement?: "float" | "dock";
  summary?: ShopSummary | null;
  histogram?: HistogramBucket[];
  adsOnly?: boolean;
  onAdsOnly?: (value: boolean) => void;
  running?: boolean;
  onStop?: () => void;
  onDeepen?: () => void;
  onDeepenOne?: (item: ScoutItem) => void;
  onPaginate?: () => void;
  onShopNote?: () => void;
  taskNote?: string;
  initialAnalisa?: boolean;
  shopCtimes?: Record<string, number>;
  relation?: "Toko sendiri" | "Toko kompetitor" | null;
  onShopAge?: () => void;
  onAffiliate?: () => void;
  onSoldOut?: () => void;
  onCategory?: () => void;
  onShopResearch?: () => void;
}) {
  const [analisa, setAnalisa] = useState(initialAnalisa);
  const visible = adsOnly ? items.filter((item) => item.isAd) : items;
  const ordered = sortScout(visible, commissions, sort);
  const maxBucket = Math.max(1, ...histogram.map((bucket) => bucket.count));
  const className = `${placement === "dock" ? "ea-scout dock" : embedded ? "ea-scout embedded" : "ea-scout"}${analisa ? " analisa" : ""}`;
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <aside className={className} aria-label="Scout Elevate Affiliate">
        <div className="ea-scout-head">
          <div className="ea-mark">E</div>
          <div className="ea-brand">
            Elevate Affiliate
            <small>{title}</small>
          </div>
          <div className="ea-spacer" />
          <button className="ea-icon-btn" type="button" onClick={onClose} aria-label="Tutup scout">
            ×
          </button>
        </div>
        {summary && (
          <div className="ea-summary">
            <div>
              <strong>{summary.count}</strong>
              <span>produk</span>
            </div>
            <div>
              <strong>
                {formatMoney(summary.minPrice, market)}–{formatMoney(summary.maxPrice, market)}
              </strong>
              <span>rentang harga</span>
            </div>
            <div>
              <strong>{summary.top3SharePct.toFixed(0)}%</strong>
              <span>terjual di 3 teratas</span>
            </div>
          </div>
        )}
        {histogram.length > 0 && (
          <div className="ea-body">
            <div className="ea-kicker">Sebaran harga</div>
            <div className="ea-bars" aria-hidden="true">
              {histogram.map((bucket) => (
                <div key={bucket.label} className="ea-bar" title={`${bucket.label}: ${bucket.count}`}>
                  <span style={{ height: `${Math.max(8, (bucket.count / maxBucket) * 72)}px` }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {items.length === 0 ? (
          <div className="ea-body">
            <div className="ea-empty">
              <strong>Belum ada produk tercatat.</strong>
              Scroll atau ganti halaman. Elevate membaca produk yang memang sudah diminta Shopee, tanpa request tambahan.
            </div>
          </div>
        ) : (
          <>
            <div className="ea-sort" role="group" aria-label="Urutkan">
              {SORTS.map((entry) => (
                <button key={entry.id} type="button" aria-pressed={sort === entry.id} onClick={() => onSort(entry.id)}>
                  {entry.label}
                </button>
              ))}
            </div>
            <div className="ea-scout-tools">
              {running && onStop ? (
                <button className="ea-btn" type="button" onClick={onStop}>
                  Stop
                </button>
              ) : (
                <button className="ea-btn primary" type="button" onClick={onCheckLive}>
                  {checkLabel}
                </button>
              )}
              <button className="ea-btn" type="button" onClick={onExport}>
                CSV
              </button>
              {onAdsOnly && (
                <button className="ea-btn" type="button" aria-pressed={adsOnly} onClick={() => onAdsOnly(!adsOnly)}>
                  {adsOnly ? "Semua" : "Iklan saja"}
                </button>
              )}
              {onDeepen && (
                <button className="ea-btn" type="button" onClick={onDeepen} disabled={running}>
                  Perdalam stok
                </button>
              )}
              {onPaginate && (
                <button className="ea-btn" type="button" onClick={onPaginate} disabled={running}>
                  Halaman berikut
                </button>
              )}
              {onShopNote && (
                <button className="ea-btn" type="button" onClick={onShopNote} disabled={running}>
                  Catatan toko
                </button>
              )}
              <button className="ea-btn" type="button" aria-pressed={analisa} onClick={() => setAnalisa((value) => !value)}>
                {analisa ? "Daftar" : "Analisa"}
              </button>
            </div>
            {taskNote && !analisa && <p className="ea-note" style={{ padding: "0 14px" }}>{taskNote}</p>}
            {analisa && (
              <AnalisaTable
                items={items}
                market={market}
                commissions={commissions}
                shopCtimes={shopCtimes}
                relation={relation}
                running={running}
                taskNote={taskNote}
                onStop={onStop}
                onShopAge={onShopAge}
                onDeepen={onDeepen}
                onDeepenOne={onDeepenOne}
                onAffiliate={onAffiliate}
                onSoldOut={onSoldOut}
                onCategory={onCategory}
                onShopResearch={onShopResearch}
              />
            )}
            {!analisa && (
            <>
            <div className="ea-list">
              {ordered.slice(0, 40).map((item) => {
                const commission = commissions[item.itemId];
                return (
                  <button key={item.itemId} className="ea-item" type="button" onClick={() => onOpen(item)}>
                    <b>
                      {item.name} {item.isAd && <span className="ea-ad">IKLAN</span>}
                    </b>
                    <em>{commission ? formatMoney(commission.amount, market) : "—"}</em>
                    <span>
                      {formatMoney(item.price, market)}
                      {item.sold !== null ? ` · ${item.sold.toLocaleString("id-ID")} terjual` : ""}
                    </span>
                    <span>{commission ? `${formatRate(commission.ratePct)} · ${commission.source === "live" ? "asli" : "estimasi"}` : ""}</span>
                  </button>
                );
              })}
            </div>
            {ordered.length > 40 && (
              <div className="ea-body">
                <p className="ea-note">Menampilkan 40 dari {ordered.length}. Ubah urutan untuk melihat yang lain. CSV tetap berisi semuanya.</p>
              </div>
            )}
            </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
