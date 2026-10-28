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
