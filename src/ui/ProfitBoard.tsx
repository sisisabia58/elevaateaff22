import { formatMoney, marketFromHost } from "../shared/money";
import type { ProfitSnapshot } from "../shared/reports";
import { elevateCss } from "./css";

const market = marketFromHost("shopee.co.id");

export function ProfitBoard({
  snapshot,
  hppCount,
  note,
  onClaim,
}: {
  snapshot: ProfitSnapshot | null;
  hppCount: number;
  note?: string | null;
  onClaim?: (orderNo: string, claimed: boolean) => void;
}) {
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div className="ea-dash">
        <div className="ea-dash-wrap">
          <div className="ea-mark">E</div>
          <h1>Laba</h1>
          <p className="lede">Omzet, penghasilan, ROAS iklan, dan laba setelah HPP. File ekspor Shopee dibaca di browser ini.</p>
          {!snapshot && (
            <div className="ea-empty">
              <strong>Belum ada laporan.</strong>
              Jatuhkan ekspor pesanan, keuangan, atau iklan. HPP per SKU bisa menyusul dari CSV.
            </div>
          )}
          {snapshot && (
            <div className="ea-metrics">
              <article className="ea-metric">
                <span className="ea-kicker">Omzet</span>
                <strong>{formatMoney(snapshot.omzet, market)}</strong>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Penghasilan</span>
                <strong>{formatMoney(snapshot.income, market)}</strong>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">ROAS iklan</span>
                <strong>{snapshot.adSpend > 0 ? `${snapshot.roas.toFixed(2)}x` : "—"}</strong>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Laba</span>
                <strong>{formatMoney(snapshot.profit, market)}</strong>
              </article>
            </div>
          )}
          <p className="ea-note">{hppCount ? `${hppCount} HPP tersimpan.` : "Belum ada HPP."} {note}</p>
          {snapshot && snapshot.shortfalls.length > 0 && (
            <div className="ea-sheet">
              <div className="ea-kicker">Ongkir kurang</div>
              <table>
                <tbody>
                  {snapshot.shortfalls.map((row) => (
                    <tr key={row.orderNo}>
                      <td>{row.orderNo}</td>
                      <td>{formatMoney(row.amount, market)}</td>
                      <td>
                        <label className="ea-check">
                          <input
                            type="checkbox"
                            checked={row.claimed}
                            onChange={(event) => onClaim?.(row.orderNo, event.target.checked)}
                          />
                          <span>Sudah diklaim</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {snapshot && snapshot.shortfalls.length === 0 && <p className="ea-note">Tidak ada selisih ongkir pada pesanan yang masuk.</p>}
        </div>
      </div>
    </div>
  );
}
