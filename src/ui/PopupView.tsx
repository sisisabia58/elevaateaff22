import { formatMoney, formatRate } from "../shared/money";
import type { CommissionView, Market, PageKind, ScoutItem } from "../shared/types";
import { elevateCss } from "./css";

export function PopupView({
  kind,
  label,
  item,
  scoutCount,
  market,
  commission,
  note,
  onOpenOptions,
  onCopyCaption,
}: {
  kind: PageKind;
  label: string;
  item: ScoutItem | null;
  scoutCount: number;
  market: Market;
  commission: CommissionView | null;
  note: string | null;
  onOpenOptions: () => void;
  onCopyCaption: () => void;
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
              <div className="ea-actions">
                <button className="ea-btn primary" type="button" onClick={onCopyCaption}>
                  Salin caption
                </button>
              </div>
            </>
          )}
          {kind === "product" && !item && (
            <div className="ea-loading">
              <strong>Halaman produk kebaca.</strong>
              Kartu di halaman akan terisi setelah Shopee mengirim detailnya.
            </div>
          )}
          {(kind === "search" || kind === "shop") && (
            <div className="ea-empty">
              <strong>{scoutCount > 0 ? `${scoutCount} produk tercatat di halaman ini.` : "Scout menunggu produk."}</strong>
              {kind === "search"
                ? "Urutkan menurut komisi, lalu salin link affiliate dari kartu produk."
                : "Di halaman toko, cek komisi asli bisa mengambil daftar penawaran toko itu sekaligus."}
            </div>
          )}
          {note && <div className="ea-status">{note}</div>}
          <div className="ea-actions">
            <button className="ea-btn full" type="button" onClick={onOpenOptions}>
              Pengaturan komisi & caption
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
