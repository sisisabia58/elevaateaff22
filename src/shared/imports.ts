export const STALE_DAYS = 35;

export type ImportKind = "pesanan" | "keuangan" | "iklan";

export type ImportEntry = { type: ImportKind; filename: string; ts: number };

export type ImportChip = {
  type: ImportKind;
  label: string;
  short: string;
  state: "missing" | "ok" | "stale";
  status: string;
  filename: string;
  shortDate: string;
  title: string;
};

const KINDS: ImportKind[] = ["pesanan", "keuangan", "iklan"];
const LABELS: Record<ImportKind, string> = { pesanan: "Laporan Pesanan", keuangan: "Laporan Keuangan", iklan: "Laporan Iklan" };
const SHORT: Record<ImportKind, string> = { pesanan: "Pesanan", keuangan: "Keuangan", iklan: "Iklan" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function stamp(ts: number, long = false): string {
  const date = new Date(ts);
  const day = String(date.getDate()).padStart(2, "0");
  const month = (long ? MONTHS_LONG : MONTHS)[date.getMonth()];
  return long ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
}

export function rememberImport(entries: ImportEntry[] | undefined, entry: ImportEntry): ImportEntry[] {
  return [entry, ...(entries || []).filter((item) => item.type !== entry.type)];
}

export type ImportLogType = ImportKind | "hpp";

export type ImportLogEntry = {
  ts: number;
  type: ImportLogType;
  filename: string;
  store: string;
  added: number;
  updated: number;
};

export const IMPORT_TYPE_LABELS: Record<ImportLogType, string> = {
  pesanan: "Laporan Pesanan (Shopee)",
  keuangan: "Laporan Keuangan (Shopee)",
  iklan: "Laporan Iklan (Shopee)",
  hpp: "Import HPP",
};

const LOG_CAP = 500;

export function rememberLog(log: ImportLogEntry[] | undefined, entry: ImportLogEntry): ImportLogEntry[] {
  return [entry, ...(log || [])].slice(0, LOG_CAP);
}

/** SENA rowsLabel: `+N baru` and `, M update` when that count is non-zero. */
export function importLogRowsLabel(entry: Pick<ImportLogEntry, "added" | "updated">): string {
  if (!(entry.added || 0) && !(entry.updated || 0)) return "—";
  const updated = entry.updated ? `, ${entry.updated} update` : "";
  return `+${entry.added || 0} baru${updated}`;
}

export function importLogTime(ts: number): string {
  return new Date(ts).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export type DashboardBackup = {
  _backupVersion: 2;
  _exportedAt: string;
  data: Record<string, unknown> | null;
  hpp: Record<string, number> | null;
  importLog: ImportLogEntry[];
};

export function backupFilename(now = new Date()): string {
  return `shopee-dashboard-backup-${now.toISOString().slice(0, 10)}.json`;
}

export function buildDashboardBackup(books: { hpp: Record<string, number>; importLog?: ImportLogEntry[] } & Record<string, unknown>, now = new Date()): DashboardBackup {
  const { hpp, importLog, ...data } = books;
  return {
    _backupVersion: 2,
    _exportedAt: now.toISOString(),
    data,
    hpp: hpp || null,
    importLog: importLog || [],
  };
}

export function parseDashboardBackup(text: string): DashboardBackup {
  let backup: unknown;
  try {
    backup = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(message);
  }
  if (!backup || typeof backup !== "object" || !("data" in backup)) throw new Error("File ini bukan file backup dashboard yang valid.");
  const record = backup as Partial<DashboardBackup>;
  return {
    _backupVersion: 2,
    _exportedAt: typeof record._exportedAt === "string" ? record._exportedAt : new Date().toISOString(),
    data: record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null,
    hpp: record.hpp && typeof record.hpp === "object" ? record.hpp : null,
    importLog: Array.isArray(record.importLog) ? record.importLog : [],
  };
}

export function clearDataConfirm(logCount: number): string {
  if (!logCount) return "Hapus semua data yang tersimpan?";
  return `Hapus SEMUA data yang tersimpan (${logCount} riwayat import)? Ini tidak bisa dibatalkan.\n\nSaran: klik "Riwayat & Backup" → "Export Backup" dulu sebelum menghapus, supaya histori bisa dipulihkan nanti kalau perlu.\n\nLanjutkan hapus?`;
}

export function importStatus(entries: ImportEntry[], now = Date.now()): ImportChip[] {
  return KINDS.map((type) => {
    const entry = entries.find((item) => item.type === type);
    if (!entry) {
      return { type, label: LABELS[type], short: SHORT[type], state: "missing", status: "Belum diupload", filename: "", shortDate: "", title: "" };
    }
    const stale = (now - entry.ts) / 86_400_000 > STALE_DAYS;
    const full = stamp(entry.ts, true);
    return {
      type,
      label: LABELS[type],
      short: SHORT[type],
      state: stale ? "stale" : "ok",
      status: `Terakhir: ${full}`,
      filename: entry.filename,
      shortDate: stamp(entry.ts),
      title: `${entry.filename} • diupload ${full}${stale ? " — udah lebih dari sebulan, cek lagi apa perlu upload yang baru" : ""}`,
    };
  });
}
