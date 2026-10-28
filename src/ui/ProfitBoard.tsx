import { useState } from "react";
import { formatCount, formatMoney, marketFromHost } from "../shared/money";
import { clearDataConfirm, IMPORT_TYPE_LABELS, importLogRowsLabel, importLogTime, importStatus, type ImportEntry, type ImportLogEntry } from "../shared/imports";
import { adChartLabel, adGapNote, adSignal, clipAdName, hppImportFailure, hppMaster, periodLabel, skuDisplayLabel, toggleStore, type AdDetail, type DateBasis, type HppLine, type ProfitCharts, type ProfitSnapshot, type ProfitWindow } from "../shared/reports";
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
  onHppFile,
  basis = "created",
  onBasis,
  basisWarning = null,
  stores = [],
  storeFilter = null,
  onStores,
  imports,
  importLog,
  onExportBackup,
  onRestoreBackup,
  onClearData,
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
  onHpp?: (sku: string, value: number, siblings?: string[]) => void;
  onHppFile?: (file: File) => Promise<string>;
  basis?: DateBasis;
  onBasis?: (basis: DateBasis) => void;
  basisWarning?: string | null;
  stores?: string[];
  storeFilter?: string[] | null;
  onStores?: (filter: string[] | null) => void;
  imports?: ImportEntry[];
  importLog?: ImportLogEntry[];
  onExportBackup?: () => void;
  onRestoreBackup?: (file: File) => Promise<string>;
  onClearData?: () => void;
}) {
  const [hppQuery, setHppQuery] = useState("");
  const [hppMissing, setHppMissing] = useState(false);
  const [hppCollapsed, setHppCollapsed] = useState<Record<string, boolean>>({});
  const [shortfallOpen, setShortfallOpen] = useState(false);
  const [hideClaimed, setHideClaimed] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy No. Pesanan belum diklaim");
  const [hppNote, setHppNote] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNote, setHistoryNote] = useState<string | null>(null);
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div className="ea-dash">
        <div className="ea-dash-wrap">
          <div className="ea-mark">E</div>
          <h1>Laba</h1>
          {importLog && (
            <div className="ea-history-bar">
              <button type="button" id="tb-history-btn" aria-expanded={historyOpen} onClick={() => setHistoryOpen((open) => !open)}>
                Riwayat & Backup
              </button>
              {onClearData && (
                <button
                  type="button"
                  id="tb-clear-btn"
                  title="Hapus semua data tersimpan"
                  onClick={() => {
                    if (window.confirm(clearDataConfirm(importLog.length))) onClearData();
                  }}
                >
                  Hapus data
                </button>
              )}
            </div>
          )}
          {importLog && historyOpen && (
            <ImportHistory
              log={importLog}
              note={historyNote}
              onExport={onExportBackup}
              onRestore={onRestoreBackup ? async (file) => {
                try {
                  setHistoryNote(await onRestoreBackup(file));
                } catch (error) {
                  const message = error instanceof Error ? error.message : String(error);
                  setHistoryNote(`Gagal restore backup: ${message}`);
                }
              } : undefined}
            />
          )}
          {imports && <ImportChips entries={imports} />}
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
            <div className={`ea-hpp-summary ${snapshot.coverage.tone}`} id="hpp-summary">
              <span id="hpp-summary-text">{snapshot.coverage.text}</span>
              <button type="button" id="btn-goto-hpp-tab" onClick={() => document.getElementById("ea-hpp")?.scrollIntoView({ block: "start" })}>
                Kelola SKU & HPP →
              </button>
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
              {snapshot.shortfalls.length > 0 && (
                <button
                  type="button"
                  className="ea-metric ea-shortfall"
                  id="card-shortfall"
                  title="Klik untuk lihat daftar No. Pesanan"
                  onClick={() => setShortfallOpen(true)}
                >
                  <span className="ea-kicker">Selisih Ongkir (bisa diklaim)</span>
                  <strong>{formatMoney(Math.abs(snapshot.shortfalls.reduce((sum, row) => sum + row.amount, 0)), market)}</strong>
                  <span>{snapshot.shortfalls.length} order kena potongan ongkir riil · klik buat lihat No. Pesanan-nya</span>
                </button>
              )}
            </div>
          )}
          {snapshot && (
            <p className="ea-note">
              {formatMoney(snapshot.income, market)} − {formatMoney(snapshot.hpp, market)} (HPP) − {formatMoney(snapshot.adSpend, market)} (Iklan) − {formatMoney(snapshot.operasional, market)} (Ops) = {formatMoney(snapshot.profit, market)}
            </p>
          )}
          {snapshot && <ProfitChartsView charts={snapshot.charts} />}
          {snapshot && <AdDetailView detail={snapshot.campaigns} />}
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
          <HppMaster
            lines={lines}
            query={hppQuery}
            onQuery={setHppQuery}
            onlyMissing={hppMissing}
            onOnlyMissing={setHppMissing}
            collapsed={hppCollapsed}
            onCollapsed={setHppCollapsed}
            note={hppNote}
            onHppFile={onHppFile ? async (file) => {
              try {
                setHppNote(await onHppFile(file));
              } catch (error) {
                setHppNote(hppImportFailure(error));
              }
            } : undefined}
            onHpp={onHpp}
          />
          <p className="ea-note">{hppCount ? `${hppCount} HPP tersimpan.` : "Belum ada HPP."} {note}</p>
          {snapshot && shortfallOpen && (
            <ShortfallModal
              rows={snapshot.shortfalls}
              hideClaimed={hideClaimed}
              onHideClaimed={setHideClaimed}
              copyLabel={copyLabel}
              onCopy={() => {
                const numbers = snapshot.shortfalls.filter((row) => !row.claimed).map((row) => row.orderNo);
                if (!numbers.length) {
                  setCopyLabel("Ngga ada yang belum diklaim");
                  window.setTimeout(() => setCopyLabel("Copy No. Pesanan belum diklaim"), 1600);
                  return;
                }
                const text = numbers.join("\n");
                const done = () => {
                  setCopyLabel(`Disalin (${numbers.length})`);
                  window.setTimeout(() => setCopyLabel("Copy No. Pesanan belum diklaim"), 1600);
                };
                const fallback = () => {
                  const area = document.createElement("textarea");
                  area.value = text;
                  area.style.position = "fixed";
                  area.style.opacity = "0";
                  document.body.appendChild(area);
                  area.select();
                  document.execCommand("copy");
                  area.remove();
                  done();
                };
                if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
                else fallback();
              }}
              onClaim={onClaim}
              onClose={() => setShortfallOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ImportHistory({
  log,
  note,
  onExport,
  onRestore,
}: {
  log: ImportLogEntry[];
  note: string | null;
  onExport?: () => void;
  onRestore?: (file: File) => Promise<void>;
}) {
  return (
    <div id="history-panel">
      <div className="ea-history-head">
        <strong>Riwayat Import</strong>
        <div>
          <button type="button" id="btn-export-backup" onClick={onExport}>Export Backup (.json)</button>
          <button type="button" id="btn-restore-backup-trigger" onClick={() => document.getElementById("file-restore-backup")?.click()}>
            Restore dari Backup
          </button>
          <input
            id="file-restore-backup"
            type="file"
            accept=".json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file || !onRestore) return;
              if (!window.confirm("Restore backup akan MENGGANTI semua data yang ada sekarang di dashboard ini dengan isi file backup. Lanjutkan?")) return;
              void onRestore(file);
            }}
          />
        </div>
      </div>
      <p className="ea-note">Data cuma tersimpan di browser ini. Export backup secara berkala (misal tiap habis upload bulanan) supaya histori tidak hilang kalau ganti device, clear cache, atau localStorage penuh.</p>
      {note && <p className="ea-note" id="history-note">{note}</p>}
      <div className="ea-iklan-scroll">
        <table>
          <thead>
            <tr>
              <th>Waktu Import</th>
              <th>Jenis Laporan</th>
              <th>Toko</th>
              <th>Nama File</th>
              <th>Baris</th>
            </tr>
          </thead>
          <tbody id="import-log-tbody">
            {log.length === 0 && (
              <tr><td colSpan={5} className="ea-hpp-empty">Belum ada riwayat import.</td></tr>
            )}
            {log.map((entry) => (
              <tr key={`${entry.ts}-${entry.filename}-${entry.type}`}>
                <td>{importLogTime(entry.ts)}</td>
                <td>{IMPORT_TYPE_LABELS[entry.type] || entry.type}</td>
                <td><span className="ea-hpp-sku">{entry.store || "Default"}</span></td>
                <td className="ea-product-name" title={entry.filename}>{entry.filename}</td>
                <td className="num">{importLogRowsLabel(entry)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportChips({ entries }: { entries: ImportEntry[] }) {
  const chips = importStatus(entries);
  return (
    <div className="ea-imports" id="ea-imports">
      <div className="ea-tb-files" id="tb-files">
        {chips.map((chip) => (
          <span key={chip.type} className={`tb-file ${chip.state}`} title={chip.title} data-type={chip.type}>
            {chip.state === "missing" ? `⬜ ${chip.short}` : `${chip.state === "stale" ? "!" : "✓"} ${chip.shortDate}`}
          </span>
        ))}
      </div>
      <div className="ea-import-row">
        {chips.map((chip) => (
          <div key={chip.type} id={`dz-${chip.type}`} className={`import-status-chip ${chip.state === "ok" ? "loaded" : chip.state}`} title={chip.title}>
            <div className="dz-label">{chip.label}</div>
            <div className={`dz-status ${chip.state === "ok" ? "ok" : chip.state}`}>{chip.status}</div>
            {chip.filename && <div className="dz-fname">{chip.filename}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function shortfallDay(iso: string | null): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function ShortfallModal({
  rows,
  hideClaimed,
  onHideClaimed,
  copyLabel,
  onCopy,
  onClaim,
  onClose,
}: {
  rows: ProfitSnapshot["shortfalls"];
  hideClaimed: boolean;
  onHideClaimed: (value: boolean) => void;
  copyLabel: string;
  onCopy: () => void;
  onClaim?: (orderNo: string, claimed: boolean) => void;
  onClose: () => void;
}) {
  const visible = hideClaimed ? rows.filter((row) => !row.claimed) : rows;
  const claimedCount = rows.filter((row) => row.claimed).length;
  const unclaimedTotal = rows.filter((row) => !row.claimed).reduce((sum, row) => sum + row.amount, 0);
  return (
    <div className="ea-modal" id="shortfall-modal" onClick={onClose}>
      <div className="ea-modal-card" onClick={(event) => event.stopPropagation()} role="dialog" aria-labelledby="shortfall-title">
        <div className="ea-modal-head">
          <h2 id="shortfall-title">Order dengan Selisih Ongkir</h2>
          <button type="button" id="shortfall-modal-close" onClick={onClose} aria-label="Tutup">×</button>
        </div>
        <p className="ea-note">Order-order di bawah ini tercatat kena potongan ongkir riil (dari &quot;Biaya Pengiriman (net)&quot; Shopee, bukan estimasi). Centang setelah kamu ajukan klaim, biar ngga keajuin dobel.</p>
        <div className="ea-shortfall-form">
          <span>Ajukan klaim langsung lewat form Shopee</span>
          <a href="https://help.shopee.co.id/portal/webform/64aeca598f7640b6919005c0d326bc97?is_from_login=true" target="_blank" rel="noopener">Buka form ↗</a>
        </div>
        <div className="ea-shortfall-tools">
          <label>
            <input id="shortfall-hide-claimed" type="checkbox" checked={hideClaimed} onChange={(event) => onHideClaimed(event.target.checked)} />
            Sembunyikan yang sudah diklaim
          </label>
          <button type="button" id="shortfall-copy-all" onClick={onCopy}>{copyLabel}</button>
        </div>
        <table>
          <thead>
            <tr>
              <th />
              <th>Tanggal</th>
              <th>Toko</th>
              <th>No. Pesanan</th>
              <th>Selisih</th>
            </tr>
          </thead>
          <tbody id="shortfall-modal-tbody">
            {visible.length === 0 ? (
              <tr><td colSpan={5} className="ea-hpp-empty">{rows.length ? "Semua order sudah diklaim." : "Ngga ada data."}</td></tr>
            ) : visible.map((row) => (
              <tr key={row.orderNo} className={row.claimed ? "claimed" : undefined}>
                <td>
                  <input
                    className="shortfall-claim-cb"
                    type="checkbox"
                    aria-label={`Klaim ${row.orderNo}`}
                    checked={row.claimed}
                    onChange={(event) => onClaim?.(row.orderNo, event.target.checked)}
                  />
                </td>
                <td>{shortfallDay(row.date)}</td>
                <td>{row.store || "—"}</td>
                <td className="mono">{row.orderNo}</td>
                <td className="num">{formatMoney(row.amount, market)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="ea-shortfall-foot">
          <span id="shortfall-footer-count">{claimedCount} dari {rows.length} sudah diklaim</span>
          <span id="shortfall-footer-total">Total belum diklaim: {formatMoney(unclaimedTotal, market)}</span>
        </div>
      </div>
    </div>
  );
}

function commitHpp(input: HTMLInputElement, siblings: string[], onHpp?: (sku: string, value: number, siblings?: string[]) => void) {
  const sku = input.dataset.sku || "";
  const applyAll = input.closest("tr")?.querySelector<HTMLInputElement>(".hpp-apply-all")?.checked;
  onHpp?.(sku, Number(input.value) || 0, applyAll ? siblings.filter((item) => item !== sku) : []);
}

function HppMaster({
  lines,
  query,
  onQuery,
  onlyMissing,
  onOnlyMissing,
  collapsed,
  onCollapsed,
  onHpp,
  onHppFile,
  note,
}: {
  lines: HppLine[];
  query: string;
  onQuery: (value: string) => void;
  onlyMissing: boolean;
  onOnlyMissing: (value: boolean) => void;
  collapsed: Record<string, boolean>;
  onCollapsed: (value: Record<string, boolean>) => void;
  onHpp?: (sku: string, value: number, siblings?: string[]) => void;
  onHppFile?: (file: File) => Promise<void>;
  note?: string | null;
}) {
  const view = hppMaster(lines, { query, onlyMissing, collapsed });
  const products = Object.keys(view.groups);
  return (
    <div className="ea-sheet ea-hpp" id="ea-hpp">
      <div className="ea-kicker">Master SKU & HPP</div>
      <div className="ea-hpp-import">
        <p className="ea-note">Isi HPP + packaging per unit sekali di sini — dipakai buat hitung profit di semua periode. Qty di tabel ini total dari SEMUA riwayat pesanan yang pernah diimport, bukan cuma periode yang lagi difilter di Dashboard Profit.</p>
        <div>
          <input
            id="file-hpp-import-master"
            type="file"
            accept=".xlsx,.csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void onHppFile?.(file);
            }}
          />
          <button
            type="button"
            id="btn-hpp-import-trigger-master"
            onClick={() => document.getElementById("file-hpp-import-master")?.click()}
          >
            Import HPP dari File
          </button>
          <span>CSV/XLSX: kolom SKU + HPP</span>
        </div>
      </div>
      {note && <p className="ea-note" id="hpp-import-status">{note}</p>}
      <div className="ea-hpp-tools">
        <input
          id="hpp-master-search"
          aria-label="Cari SKU atau nama produk"
          placeholder="Cari SKU atau nama produk…"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
        <label>
          <input id="hpp-master-filter-missing" type="checkbox" checked={onlyMissing} onChange={(event) => onOnlyMissing(event.target.checked)} />
          Cuma yang belum diisi
        </label>
        <button type="button" id="btn-hpp-expand-all" onClick={() => onCollapsed(Object.fromEntries(products.map((product) => [product, false])))}>Buka semua</button>
        <button type="button" id="btn-hpp-collapse-all" onClick={() => onCollapsed(Object.fromEntries(products.map((product) => [product, true])))}>Tutup semua</button>
      </div>
      <div className="ea-iklan-scroll">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th>Nama Varian</th>
              <th>Total Terjual (semua periode)</th>
              <th>HPP+Pkg /unit (Rp)</th>
              <th>Total HPP (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {view.rows.length === 0 && (
              <tr><td colSpan={7} className="ea-hpp-empty">Gak ada SKU yang cocok.</td></tr>
            )}
            {view.rows.map((row) => row.kind === "group" ? (
              <tr
                key={`group-${row.product}`}
                className="hpp-group-header"
                onClick={() => onCollapsed({ ...collapsed, [row.product]: !row.collapsed })}
              >
                <td>{row.collapsed ? "▶" : "▼"}</td>
                <td>{row.count} varian</td>
                <td>{row.product}</td>
                <td />
                <td className="num">{Math.round(row.qty).toLocaleString("id-ID")}</td>
                <td>
                  {row.filled === row.count ? (
                    <span className="ea-hpp-badge ok">Semua varian terisi</span>
                  ) : (
                    <span className="ea-hpp-badge miss">{row.count - row.filled}/{row.count} varian belum diisi</span>
                  )}
                </td>
                <td className="num">{formatMoney(row.totalHpp, market)}</td>
              </tr>
            ) : (
              <tr key={row.line.sku}>
                <td>{row.rowNum}</td>
                <td><span className="ea-hpp-sku">{skuDisplayLabel(row.line.sku)}</span></td>
                <td className={row.indent ? "indent" : undefined}>{row.indent ? "" : row.line.product || "—"}</td>
                <td>{row.line.variant || "—"}</td>
                <td className="num">{Math.round(row.line.qty).toLocaleString("id-ID")}</td>
                <td>
                  <div className="ea-hpp-edit">
                    <input
                      key={`${row.line.sku}:${row.line.hpp}`}
                      className="hpp-input"
                      aria-label={`HPP ${row.line.sku}`}
                      data-sku={row.line.sku}
                      type="number"
                      min={0}
                      defaultValue={row.line.hpp || ""}
                      placeholder="0"
                      onBlur={(event) => commitHpp(event.currentTarget, row.siblings, onHpp)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitHpp(event.currentTarget, row.siblings, onHpp);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="hpp-apply-btn"
                      title="Terapkan HPP"
                      onClick={(event) => {
                        const input = event.currentTarget.parentElement?.querySelector("input");
                        if (input) commitHpp(input, row.siblings, onHpp);
                      }}
                    >
                      ✓
                    </button>
                  </div>
                  {row.siblings.length > 1 && (
                    <label className="ea-hpp-all">
                      <input className="hpp-apply-all" type="checkbox" />
                      Terapkan ke semua varian
                    </label>
                  )}
                </td>
                <td className="num">{formatMoney(row.line.hpp * row.line.qty, market)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total (sesuai filter di atas)</td>
              <td className="num">{Math.round(view.totalQty).toLocaleString("id-ID")}</td>
              <td />
              <td className="num">{formatMoney(view.totalHpp, market)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function AdDetailView({ detail }: { detail: AdDetail }) {
  const gap = adGapNote(detail);
  const maxMoney = Math.max(1, ...detail.rows.map((row) => Math.max(row.spend, row.gmv)));
  const maxRoas = Math.max(...detail.rows.map((row) => row.roas), 1);
  const roasScale = Math.ceil(maxRoas * 1.3);
  return (
    <section className="ea-sheet ea-iklan" id="ea-iklan">
      <div className="ea-kicker">Detail Iklan</div>
      {detail.periodLabel && (
        <p className="ea-iklan-period">
          Laporan iklan terakhir diimport untuk periode: <strong>{detail.periodLabel}</strong> · Data di bawah sudah mengikuti filter periode/custom range di atas, diprorata per hari kalau windownya lebih sempit dari periode laporan (Shopee tidak expor biaya iklan harian).
        </p>
      )}
      {gap && <p className="ea-iklan-gap" id="ea-iklan-gap">{gap}</p>}
      {detail.rows.length === 0 ? (
        <p className="ea-note">Import Laporan Iklan untuk melihat data iklan</p>
      ) : (
        <>
          <div className="ea-metrics ea-profit-metrics">
            <article className="ea-metric">
              <span className="ea-kicker">Total Ad Spend</span>
              <strong>{formatMoney(detail.spend, market)}</strong>
              <span>{detail.rows.length} kampanye{detail.prorated ? " · ≈ prorata harian" : ""}</span>
            </article>
            <article className="ea-metric">
              <span className="ea-kicker">GMV dari Iklan</span>
              <strong>{formatMoney(detail.gmv, market)}</strong>
              <span>Omzet dari iklan</span>
            </article>
            <article className="ea-metric">
              <span className="ea-kicker">Overall ROAS</span>
              <strong>{detail.spend > 0 ? `${detail.roas.toFixed(2)}×` : "—"}</strong>
              <span>GMV / Ad Spend</span>
            </article>
            <article className="ea-metric">
              <span className="ea-kicker">Total Konversi</span>
              <strong>{Math.round(detail.orders)}</strong>
              <span>{formatCount(detail.clicks)} klik</span>
            </article>
            <article className="ea-metric">
              <span className="ea-kicker">Avg CPA</span>
              <strong>{formatMoney(detail.cpa, market)}</strong>
              <span>Biaya per konversi</span>
            </article>
          </div>
          <div className="ea-iklan-scroll">
            <table>
              <thead>
                <tr>
                  <th>IKLAN</th>
                  <th>SINYAL</th>
                  <th>STATUS</th>
                  <th>MODE</th>
                  <th>ROAS</th>
                  <th>KONVERSI</th>
                  <th>KLIK</th>
                  <th>AD SPEND</th>
                  <th>GMV</th>
                  <th>CPA</th>
                </tr>
              </thead>
              <tbody>
                {detail.rows.map((row) => {
                  const signal = adSignal(row.roas);
                  return (
                    <tr key={`${row.name}-${row.mode}`}>
                      <td>
                        <div className="ea-iklan-name">{clipAdName(row.name)}</div>
                        <div className="ea-iklan-mode">{row.mode}</div>
                      </td>
                      <td><span className={`ea-signal ${signal.toLowerCase()}`}>{signal}</span></td>
                      <td className={row.status === "Berjalan" ? "ea-status berjalan" : "ea-status lain"}>{row.status}</td>
                      <td>{row.mode}</td>
                      <td>
                        <strong className={row.roas >= 3 ? "ea-roas good" : "ea-roas bad"}>{row.roas.toFixed(2)}×</strong>
                        <div className="ea-roas-track">
                          <i style={{ width: `${Math.min((row.roas / maxRoas) * 100, 100).toFixed(0)}%`, background: row.roas >= 3 ? "#16a34a" : "#dc2626" }} />
                        </div>
                      </td>
                      <td className="num">{Math.round(row.orders)}</td>
                      <td className="num">{formatCount(row.clicks)}</td>
                      <td className="num">{formatMoney(row.spend, market)}</td>
                      <td className="num">{formatMoney(row.gmv, market)}</td>
                      <td className="num">{formatMoney(row.cpa, market)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="ea-chart">
            <h2>ROAS & Ad Spend per Iklan</h2>
            <p className="sub">Perbandingan efisiensi kampanye</p>
            <div className="ea-ad-legend">
              <span><i className="spend" /> Ad Spend</span>
              <span><i className="gmv" /> GMV</span>
              <span><i className="roas" /> ROAS</span>
            </div>
            {detail.rows.map((row) => (
              <div className="ea-ad-row" key={`chart-${row.name}`}>
                <div className="name">{adChartLabel(row.name)}</div>
                <div className="ea-mini"><span>Ad Spend</span><i className="spend" style={{ width: `${(row.spend / maxMoney) * 100}%` }} /><b>{formatMoney(row.spend, market)}</b></div>
                <div className="ea-mini"><span>GMV</span><i className="gmv" style={{ width: `${(row.gmv / maxMoney) * 100}%` }} /><b>{formatMoney(row.gmv, market)}</b></div>
                <div className="ea-mini"><span>ROAS</span><i className="roas" style={{ width: `${Math.min((row.roas / roasScale) * 100, 100)}%` }} /><b>{row.roas.toFixed(2)}×</b></div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ProfitChartsView({ charts }: { charts: ProfitCharts }) {
  const maxDaily = Math.max(1, ...charts.daily.map((day) => day.omzet));
  const maxPay = Math.max(1, ...charts.payments.map((row) => row.count));
  const maxShip = Math.max(1, ...charts.shipping.map((row) => row.count));
  const maxProv = Math.max(1, ...charts.provinces.map((row) => row.omzet));
  const maxFee = Math.max(1, ...charts.fees.map((row) => row.amount));
  return (
    <div className="ea-charts">
      {charts.daily.length > 0 && (
        <section className="ea-chart" aria-label="Tren Omzet Harian">
          <h2>Tren Omzet Harian</h2>
          <p className="sub">{charts.dailyLabel}</p>
          <div className="ea-vbars">
            {charts.daily.map((day) => (
              <div key={day.date} className="ea-vbar" title={`${day.orders} order`}>
                <b>{day.orders}</b>
                <i style={{ height: `${Math.max(8, (day.omzet / maxDaily) * 88)}px` }} />
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="ea-split">
        {charts.fees.length > 0 && (
          <section className="ea-chart" aria-label="Breakdown Biaya Marketplace">
            <h2>Breakdown Biaya Marketplace</h2>
            <p className="sub">Total: {formatMoney(charts.fees.reduce((sum, row) => sum + row.amount, 0), market)}</p>
            {charts.fees.map((row) => (
              <div key={row.label} className="ea-hbar">
                <span>{row.label}</span>
                <i style={{ width: `${(row.amount / maxFee) * 100}%` }} />
                <b>{formatMoney(row.amount, market)}</b>
              </div>
            ))}
          </section>
        )}
        {charts.payments.length > 0 && (
          <section className="ea-chart" aria-label="Metode Pembayaran">
            <h2>Metode Pembayaran</h2>
            <p className="sub">Distribusi per order non-batal</p>
            {charts.payments.map((row) => (
              <div key={row.label} className="ea-hbar">
                <span>{row.label}</span>
                <i style={{ width: `${(row.count / maxPay) * 100}%` }} />
                <b>{row.count} order</b>
              </div>
            ))}
          </section>
        )}
      </div>
      <div className="ea-split">
        {charts.provinces.length > 0 && (
          <section className="ea-chart" aria-label="Top Provinsi">
            <h2>Top Provinsi</h2>
            <p className="sub">Berdasarkan omzet</p>
            {charts.provinces.map((row) => (
              <div key={row.label} className="ea-hbar">
                <span title={row.label}>{row.label}</span>
                <i style={{ width: `${(row.omzet / maxProv) * 100}%` }} />
                <b>{formatMoney(row.omzet, market)} · {row.orders}×</b>
              </div>
            ))}
          </section>
        )}
        {charts.shipping.length > 0 && (
          <section className="ea-chart" aria-label="Jasa Pengiriman">
            <h2>Jasa Pengiriman</h2>
            <p className="sub">Distribusi per order</p>
            {charts.shipping.map((row) => (
              <div key={row.label} className="ea-hbar">
                <span>{row.label}</span>
                <i style={{ width: `${(row.count / maxShip) * 100}%` }} />
                <b>{row.count}</b>
              </div>
            ))}
          </section>
        )}
      </div>
      {charts.products.length > 0 && (
        <section className="ea-chart ea-products" aria-label="Top Produk berdasarkan Omzet">
          <h2>Top Produk berdasarkan Omzet</h2>
          <p className="sub" id="product-sub">{charts.products.length} SKU · {charts.orderCount} order non-batal</p>
          <div className="ea-iklan-scroll">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Nama Produk</th>
                  <th>Omzet</th>
                  <th>Qty</th>
                  <th>Order</th>
                  <th>% Omzet</th>
                </tr>
              </thead>
              <tbody id="product-tbody">
                {charts.products.map((row, index) => {
                  const share = (row.omzet / (charts.totalOmzet || 1)) * 100;
                  return (
                    <tr key={row.sku}>
                      <td>{index + 1}</td>
                      <td><span className="ea-hpp-sku">{skuDisplayLabel(row.sku)}</span></td>
                      <td className="ea-product-name" title={row.name}>{row.name}</td>
                      <td className="num">{formatMoney(row.omzet, market)}</td>
                      <td className="num">{Math.round(row.qty).toLocaleString("id-ID")}</td>
                      <td className="num">{row.orders}</td>
                      <td>
                        <span className="ea-share">
                          <i><b style={{ width: `${Math.min(share, 100).toFixed(0)}%` }} /></i>
                          <em>{share.toFixed(1)}%</em>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
