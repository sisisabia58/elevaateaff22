import { formatMoney, formatRate } from "../shared/money";
import type { CommissionView, Market, ScoutItem } from "../shared/types";
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
}) {
  const ordered = sortScout(items, commissions, sort);
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <aside className={embedded ? "ea-scout embedded" : "ea-scout"} aria-label="Scout Elevate Affiliate">
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
              <button className="ea-btn primary" type="button" onClick={onCheckLive}>
                {checkLabel}
              </button>
              <button className="ea-btn" type="button" onClick={onExport}>
                CSV
              </button>
            </div>
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
      </aside>
    </div>
  );
}
