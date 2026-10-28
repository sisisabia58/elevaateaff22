import { formatMoney, marketFromHost } from "../shared/money";
import { periodLabel, toggleStore, type DateBasis, type HppLine, type ProfitSnapshot, type ProfitWindow } from "../shared/reports";
import { elevateCss } from "./css";

const market = marketFromHost("shopee.co.id");

const DISCOUNT_LINES: Array<{ key: keyof ProfitSnapshot["flow"]; label: string }> = [
  { key: "cashback", label: "Voucher / Cashback Penjual" },
  { key: "promoOngkir", label: "Promo Gratis Ongkir Penjual" },
  { key: "refund", label: "Pengembalian Dana ke Pembeli" },
];

const FEE_LINES: Array<{ key: keyof ProfitSnapshot["flow"]; label: string }> = [
  { key: "admin", label: "Biaya Administrasi" },
  { key: "proses", label: "Biaya Proses Pesanan" },
  { key: "pengiriman", label: "Biaya Pengiriman (net)" },
  { key: "xtra", label: "Biaya XTRA (Gratis Ongkir)" },
  { key: "layanan", label: "Biaya Layanan & Video XTRA" },
  { key: "ams", label: "Komisi AMS / Afiliasi Shopee" },
  { key: "kampanye", label: "Biaya Kampanye" },
  { key: "lainnya", label: "Biaya Lainnya / Pajak" },
];

function marketplaceCost(snapshot: ProfitSnapshot): number {
  return FEE_LINES.reduce((sum, line) => sum + snapshot.flow[line.key], 0);
}

export function ProfitBoard({
  snapshot,
  hppCount,
  note,
  onClaim,
  onOperasional,
  periods = [],
  period = null,
  onPeriod,
  range = null,
  onRange,
  lines = [],
  onHpp,
  basis = "created",
  onBasis,
  basisWarning = null,
  stores = [],
  storeFilter = null,
  onStores,
}: {
  snapshot: ProfitSnapshot | null;
  hppCount: number;
  note?: string | null;
  onClaim?: (orderNo: string, claimed: boolean) => void;
  onOperasional?: (value: number) => void;
  periods?: string[];
  period?: string | null;
  onPeriod?: (period: string | null) => void;
  range?: ProfitWindow | null;
  onRange?: (range: ProfitWindow | null) => void;
  lines?: HppLine[];
  onHpp?: (sku: string, value: number) => void;
  basis?: DateBasis;
  onBasis?: (basis: DateBasis) => void;
  basisWarning?: string | null;
  stores?: string[];
  storeFilter?: string[] | null;
  onStores?: (filter: string[] | null) => void;
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
          {stores.length > 1 && onStores && (
            <div className="ea-stores" role="group" aria-label="Filter Toko">
              <span>Filter Toko</span>
              {stores.map((name) => {
                const checked = storeFilter == null || storeFilter.includes(name);
                return (
                  <label key={name} className={checked ? "on" : ""}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onStores(toggleStore(name, stores, storeFilter))}
                    />
                    {name}
                  </label>
                );
              })}
              <button type="button" onClick={() => onStores(null)}>Pilih Semua</button>
              <button type="button" onClick={() => onStores([])}>Kosongkan</button>
            </div>
          )}
          {onBasis && (
            <label className="ea-basis">
              Basis tanggal
              <select
                id="ea-date-basis"
                aria-label="Basis tanggal"
                value={basis}
                onChange={(event) => onBasis(event.target.value as DateBasis)}
              >
                <option value="created">Waktu Pesanan Dibuat</option>
                <option value="confirmed">Waktu Pesanan Dikonfirmasi</option>
                <option value="completed">Waktu Pesanan Selesai</option>
                <option value="released">Waktu Pelepasan Dana (Shopee)</option>
              </select>
            </label>
          )}
          {basisWarning && (
            <p className="ea-warn" id="ea-date-basis-warn" role="status">
              {basisWarning}
            </p>
          )}
          {periods.length > 0 && onPeriod && (
            <div className="ea-chips" role="group" aria-label="Periode">
              <button type="button" aria-pressed={!(range?.from && range?.to) && period === null} onClick={() => { onRange?.(null); onPeriod(null); }}>
                Semua
              </button>
              {periods.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  aria-pressed={!(range?.from && range?.to) && period === entry}
                  onClick={() => {
                    onRange?.(null);
                    onPeriod(entry);
                  }}
                >
                  {periodLabel(entry)}
                </button>
              ))}
            </div>
          )}
          {onRange && (
            <div className="ea-range">
              <label>
                Dari
                <input
                  type="date"
                  aria-label="Dari"
                  value={range?.from ?? ""}
                  onChange={(event) => onRange({ from: event.target.value, to: range?.to ?? "" })}
                />
              </label>
              <label>
                Sampai
                <input
                  type="date"
                  aria-label="Sampai"
                  value={range?.to ?? ""}
                  onChange={(event) => onRange({ from: range?.from ?? "", to: event.target.value })}
                />
              </label>
            </div>
          )}
          {snapshot && (
            <div className="ea-metrics ea-profit-metrics">
              <article className="ea-metric">
                <span className="ea-kicker">Total Omzet</span>
                <strong>{formatMoney(snapshot.omzet, market)}</strong>
                <span>{snapshot.orders} order</span>
              </article>
              {marketplaceCost(snapshot) !== 0 && (
                <article className="ea-metric">
                  <span className="ea-kicker">Biaya Marketplace Shopee</span>
                  <strong>{formatMoney(Math.abs(marketplaceCost(snapshot)), market)}</strong>
                  <span>
                    {snapshot.flow.harga > 0 ? `${((Math.abs(marketplaceCost(snapshot)) / snapshot.flow.harga) * 100).toFixed(1)}% dari harga produk` : "—"} · {snapshot.orders} order
                  </span>
                </article>
              )}
              <article className="ea-metric">
                <span className="ea-kicker">Income Shopee (net)</span>
                <strong>{formatMoney(snapshot.income, market)}</strong>
                <span>{snapshot.flow.harga > 0 ? `${((snapshot.income / snapshot.flow.harga) * 100).toFixed(1)}% dari harga produk` : "—"}</span>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Biaya Iklan Shopee</span>
                <strong>{formatMoney(snapshot.adSpend, market)}</strong>
                <span>
                  {snapshot.prorated ? "≈ prorata harian" : snapshot.adSpend > 0 ? `ROAS: ${snapshot.roas.toFixed(2)}×` : "—"}
                </span>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">GMV dari Iklan</span>
                <strong>{formatMoney(snapshot.adGmv, market)}</strong>
                <span>Omzet dari iklan</span>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Overall ROAS</span>
                <strong>{snapshot.adSpend > 0 ? `${snapshot.roas.toFixed(2)}×` : "—"}</strong>
                <span>GMV / Ad Spend</span>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Order Batal</span>
                <strong>{snapshot.cancelled}</strong>
              </article>
              <article className="ea-metric">
                <span className="ea-kicker">Laba</span>
                <strong>{formatMoney(snapshot.profit, market)}</strong>
              </article>
            </div>
          )}
          {snapshot && (
            <p className="ea-note">
              {formatMoney(snapshot.income, market)} − {formatMoney(snapshot.hpp, market)} (HPP) − {formatMoney(snapshot.adSpend, market)} (Iklan) − {formatMoney(snapshot.operasional, market)} (Ops) = {formatMoney(snapshot.profit, market)}
            </p>
          )}
          {snapshot && onOperasional && (
            <label className="ea-field">
              Operasional
              <input
                aria-label="Operasional"
                type="number"
                value={snapshot.operasional}
                onChange={(event) => onOperasional(Number(event.target.value) || 0)}
              />
            </label>
          )}
          {snapshot && (snapshot.flow.harga !== 0 || marketplaceCost(snapshot) !== 0) && (
            <div className="ea-sheet">
              <div className="ea-kicker">Alur dana</div>
              <table>
                <tbody>
                  <tr>
                    <td>Harga Produk Terjual (gross)</td>
                    <td>{formatMoney(snapshot.flow.harga, market)}</td>
                  </tr>
                  {DISCOUNT_LINES.some((line) => snapshot.flow[line.key] !== 0) && (
                    <tr className="ea-flow-head"><td colSpan={2}>DISKON DITANGGUNG PENJUAL</td></tr>
                  )}
                  {DISCOUNT_LINES.filter((line) => snapshot.flow[line.key] !== 0).map((line) => (
                    <tr key={line.key}>
                      <td>{line.label}</td>
                      <td className="down">{formatMoney(snapshot.flow[line.key], market)}</td>
                    </tr>
                  ))}
                  {FEE_LINES.some((line) => snapshot.flow[line.key] !== 0) && (
                    <tr className="ea-flow-head"><td colSpan={2}>BIAYA MARKETPLACE SHOPEE</td></tr>
                  )}
                  {FEE_LINES.filter((line) => snapshot.flow[line.key] !== 0).map((line) => (
                    <tr key={line.key}>
                      <td>{line.label}</td>
                      <td className={snapshot.flow[line.key] < 0 ? "down" : undefined}>{formatMoney(snapshot.flow[line.key], market)}</td>
                    </tr>
                  ))}
                  {marketplaceCost(snapshot) !== 0 && (
                    <tr>
                      <td>Total Biaya Shopee</td>
                      <td className="down">{formatMoney(marketplaceCost(snapshot), market)}</td>
                    </tr>
                  )}
                  {snapshot.flow.kompensasi !== 0 && (
                    <tr>
                      <td>Kompensasi</td>
                      <td>{formatMoney(snapshot.flow.kompensasi, market)}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Income Shopee (net)</td>
                    <td>{formatMoney(snapshot.income, market)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="ea-note">Income = dana bersih yang disetorkan Shopee ke saldo penjual setelah semua fee dipotong. Real Profit = Total Income − HPP − Biaya Iklan − Biaya Operasional.</p>
            </div>
          )}
          {lines.length > 0 && (
            <div className="ea-sheet">
              <div className="ea-kicker">Master SKU & HPP</div>
              <p className="ea-note">Qty di tabel ini total dari semua pesanan yang pernah masuk, bukan cuma periode yang lagi dipilih.</p>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Produk</th>
                    <th>Total terjual</th>
                    <th>HPP / unit</th>
                    <th>Total HPP</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.sku}>
                      <td>{line.sku}</td>
                      <td>{line.name}</td>
                      <td>{line.qty.toLocaleString("id-ID")}</td>
                      <td>
                        <input
                          aria-label={`HPP ${line.sku}`}
                          type="number"
                          value={line.hpp || ""}
                          onChange={(event) => onHpp?.(line.sku, Number(event.target.value) || 0)}
                        />
                      </td>
                      <td>{formatMoney(line.qty * line.hpp, market)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
