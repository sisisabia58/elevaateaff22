import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import * as XLSX from "xlsx";
import { loadSession } from "../shared/auth";
import { loadBooks, saveBooks, type Books } from "../shared/books";
import { downloadText } from "../shared/csv";
import { dateBasisWarning, hppLines, listPeriods, parseCsv, parseExportGrid, parseHppCsv, snapshot, type DateBasis, type ProfitWindow } from "../shared/reports";
import { ProfitBoard } from "../ui/ProfitBoard";

const SAMPLE_ORDERS = `No. Pesanan,Nomor Referensi SKU,Nama Produk,Jumlah,Harga Produk,Ongkir dibayar pembeli,Ongkir ke kurir,Status Pesanan,Waktu Pesanan Dibuat,Waktu Pesanan Dikonfirmasi,Waktu Pesanan Selesai
A1,SKU1,Tumbler,2,80000,5000,12000,Selesai,2026-10-15 09:00,2026-11-01 09:00,2026-11-02 09:00
A2,SKU1,Tumbler,1,40000,0,0,Batal,2026-10-16 09:00,2026-10-16 10:00,2026-10-16 11:00`;
const SAMPLE_FINANCE = `No. Pesanan,Harga Produk,Total Penghasilan,Biaya Administrasi,Biaya Layanan,Waktu Pelepasan Dana
A1,80000,75000,-4000,-1000,2026-11-05`;
const SAMPLE_ADS = `Periode,01/10/2026 - 28/10/2026
Nama Iklan,Biaya,Omzet Penjualan,Produk Terjual
Tumbler,10000,40000,2`;

function readSheet(buffer: ArrayBuffer): { headers: string[]; rows: string[][] } {
  const book = XLSX.read(buffer, { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown[][];
  const lines = grid.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  const [header = [], ...rest] = lines;
  return {
    headers: header.map((cell) => String(cell ?? "")),
    rows: rest.map((row) => row.map((cell) => String(cell ?? ""))),
  };
}

function DashboardApp() {
  const [books, setBooks] = useState<Books | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [period, setPeriod] = useState<string | null>(null);
  const [range, setRange] = useState<ProfitWindow | null>(null);
  const [basis, setBasis] = useState<DateBasis>("created");

  useEffect(() => {
    void loadBooks().then(setBooks);
    void loadSession().then((session) => setEmail(session?.email ?? null));
  }, []);

  const view = useMemo(() => {
    if (!books) return null;
    if (!books.orders.length && !books.finance.length && !books.ads.length) return null;
    const activeRange = range?.from && range?.to ? range : null;
    return snapshot({
      orders: books.orders,
      finance: books.finance,
      ads: books.ads,
      hppBySku: books.hpp,
      claimed: books.claimed,
      operasional: books.operasional || 0,
      period: activeRange ? null : period,
      range: activeRange,
      basis,
    });
  }, [books, period, range, basis]);

  async function persist(next: Books, message: string | null) {
    setBooks(next);
    await saveBooks(next);
    if (message == null) return;
    const session = await loadSession();
    setNote(session?.userId ? `${message} Cadangan HPP dikirim ke Supabase.` : `${message} Tersimpan di browser ini.`);
  }

  async function takeFile(file: File) {
    setReading(true);
    setNote(null);
    try {
      const table = file.name.endsWith(".csv") ? parseCsv(await file.text()) : readSheet(await file.arrayBuffer());
      const parsed = parseExportGrid([table.headers, ...table.rows]);
      if (parsed.kind === "unknown") {
        setNote("File ini bukan ekspor pesanan, keuangan, atau iklan.");
        return;
      }
      if (!books) return;
      const next: Books = {
        ...books,
        orders: parsed.kind === "pesanan" ? parsed.orders : books.orders,
        finance: parsed.kind === "keuangan" ? parsed.finance : books.finance,
        ads: parsed.kind === "iklan" ? parsed.ads : books.ads,
      };
      await persist(next, `Ekspor ${parsed.kind} masuk.`);
    } catch {
      setNote("File tidak bisa dibaca.");
    } finally {
      setReading(false);
    }
  }

  if (!books) return null;

  return (
    <>
      <div className="ea-dash">
        <div className="ea-dash-wrap">
          <div className="ea-drop">
            <strong>{reading ? "Membaca file…" : "Jatuhkan ekspor Shopee"}</strong>
            <p className="ea-note">{email ? `Cadangan untuk ${email}.` : "Belum login. Data tetap di browser ini."}</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void takeFile(file);
              }}
            />
            <div className="ea-actions">
              <button
                className="ea-btn"
                type="button"
                onClick={() => {
                  const orders = parseExportGrid(gridOf(SAMPLE_ORDERS)).orders;
                  const finance = parseExportGrid(gridOf(SAMPLE_FINANCE)).finance;
                  const ads = parseExportGrid(gridOf(SAMPLE_ADS)).ads;
                  void persist({ ...books, orders, finance, ads, hpp: { ...books.hpp, SKU1: 15000 } }, "Contoh dimuat.");
                }}
              >
                Muat contoh
              </button>
              <button
                className="ea-btn"
                type="button"
                onClick={() => downloadText("elevate-laba.json", JSON.stringify(books, null, 2), "application/json")}
              >
                Unduh cadangan
              </button>
              <label className="ea-btn">
                Impor HPP
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void file.text().then((text) => {
                      const hpp = { ...books.hpp, ...parseHppCsv(text) };
                      void persist({ ...books, hpp }, "HPP diperbarui.");
                    });
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
      <ProfitBoard
        snapshot={view}
        hppCount={Object.keys(books.hpp).length}
        note={note}
        periods={listPeriods(books.orders, books.finance, basis)}
        period={period}
        onPeriod={setPeriod}
        range={range}
        onRange={setRange}
        basis={basis}
        onBasis={(next) => {
          setBasis(next);
          const months = listPeriods(books.orders, books.finance, next);
          if (period && !months.includes(period)) setPeriod(null);
        }}
        basisWarning={dateBasisWarning(books.orders, books.finance, basis)}
        lines={hppLines(books.orders, books.hpp)}
        onHpp={(sku, value) => {
          void persist({ ...books, hpp: { ...books.hpp, [sku]: value } }, null);
        }}
        onOperasional={(value) => {
          void persist({ ...books, operasional: value }, null);
        }}
        onClaim={(orderNo, claimed) => {
          const next = claimed ? [...books.claimed, orderNo] : books.claimed.filter((id) => id !== orderNo);
          void persist({ ...books, claimed: next }, claimed ? "Ditandai diklaim." : "Klaim dibuka lagi.");
        }}
      />
    </>
  );
}

function gridOf(text: string): string[][] {
  const table = parseCsv(text);
  return [table.headers, ...table.rows];
}

createRoot(document.getElementById("root")!).render(<DashboardApp />);
