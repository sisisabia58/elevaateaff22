import type { ReactNode } from "react";
import { formatMoney, formatRate } from "../shared/money";
import type { CommissionView, Market, PageKind, ScoutItem } from "../shared/types";
import { elevateCss } from "./css";
import { ProductMetrics } from "./ProductMetrics";

export function PopupView({
  kind,
  label,
  item,
  scoutCount,
  market,
  commission,
  note,
  onOpenOptions,
  onOpenDashboard,
  onCopyCaption,
  onRank,
  ranking,
}: {
  kind: PageKind;
  label: string;
  item: ScoutItem | null;
  scoutCount: number;
  market: Market;
  commission: CommissionView | null;
  note: string | null;
  onOpenOptions: () => void;
  onOpenDashboard: () => void;
  onCopyCaption: () => void;
  onRank?: () => void;
  ranking?: ReactNode;
}) {
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div className="ea-popup">
        <div className="ea-pop-head">
          <div className="ea-mark">E</div>
          <div className="ea-brand">
            Elevate Affiliate
            <small>{label}</small>
          </div>
        </div>
        <div className="ea-body">
          {kind === "other" && (
            <div className="ea-empty">
              <strong>Buka halaman Shopee.</strong>
              Kartu komisi muncul di produk. Scout muncul di pencarian dan toko. Pengaturan komisi default ada di bawah.
            </div>
          )}
          {kind === "product" && item && commission && (
            <>
              <h2 className="ea-name">{item.name}</h2>
              <div className="ea-meta">{formatMoney(item.price, market)}</div>
              <div className="ea-commission">
                <div>
                  <div className="ea-kicker">Komisi</div>
                  <div className="ea-amount">{formatMoney(commission.amount, market)}</div>
                </div>
                <span className={`ea-badge ${commission.source}`}>{formatRate(commission.ratePct)}</span>
              </div>
              <p className="ea-note">{commission.note}</p>
              <ProductMetrics item={item} market={market} />
              <div className="ea-actions">
                <button className="ea-btn primary" type="button" onClick={onCopyCaption}>
                  Salin caption
                </button>
                {onRank && (
                  <button className="ea-btn" type="button" onClick={onRank}>
                    Peringkat varian
                  </button>
                )}
              </div>
              {ranking}
            </>
          )}
          {kind === "product" && !item && (
            <div className="ea-loading">
              <strong>Halaman produk kebaca.</strong>
              Kartu di halaman akan terisi setelah Shopee mengirim detailnya.
            </div>
          )}
          {(kind === "search" || kind === "category" || kind === "shop") && (
            <div className="ea-empty">
              <strong>{scoutCount > 0 ? `${scoutCount} produk tercatat di halaman ini.` : "Scout menunggu produk."}</strong>
              {kind === "shop"
                ? "Riset toko menempel di atas daftar produk."
                : kind === "category"
                  ? "Analisa kategori menempel di atas daftar produk."
                  : "Riset market menempel di atas daftar produk."}
            </div>
          )}
          {note && <div className="ea-status">{note}</div>}
          <div className="ea-actions">
            <button className="ea-btn" type="button" onClick={onOpenDashboard}>
              Laba
            </button>
            <button className="ea-btn" type="button" onClick={onOpenOptions}>
              Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
