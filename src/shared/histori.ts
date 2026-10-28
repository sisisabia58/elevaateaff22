const KEY = "ea-roas-histori";
const PERIOD_RE = /^\d{1,2}\/\d{1,2}\s*-\s*\d{1,2}\/\d{1,2}\s*\(GMT[+-]?\d+\)$/i;
const MAX_SNAPSHOTS = 30;

export type HistoriSnapshot = {
  savedAt: number;
  periodLabel: string;
  iklanDilihat: number;
  tingkatKonversi: number | null;
  biayaIklanAktual: number;
  roasAktual: number | null;
  note: string;
};

export type HistoriRead = {
  snapshot: HistoriSnapshot;
  missingConversion: boolean;
};

export function historiProductId(href: string): string {
  const match = href.match(/\/portal\/marketing\/pas\/product\/manual(?:-[a-z0-9]+)?\/(\d+)/i);
  return match?.[1] ?? "__account__";
}

export function historiFilename(productId: string, day = new Date().toISOString().slice(0, 10)): string {
  return `histori-performa-${productId === "__account__" ? "akun" : productId}-${day}.csv`;
}

export function formatSavedAt(ts: number): string {
  const date = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function roasDeltaPct(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function pushSnapshot(list: HistoriSnapshot[], snapshot: HistoriSnapshot): HistoriSnapshot[] {
  const next = [...list, snapshot];
  return next.length > MAX_SNAPSHOTS ? next.slice(next.length - MAX_SNAPSHOTS) : next;
}

export function removeSnapshot(list: HistoriSnapshot[], savedAt: number): HistoriSnapshot[] {
  return list.filter((snapshot) => snapshot.savedAt !== savedAt);
}

function round2(value: number | null): number | "" {
  return typeof value === "number" ? Math.round(value * 100) / 100 : "";
}

function csvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function historiCsv(snapshots: HistoriSnapshot[]): string {
  const header = ["Tanggal Simpan", "Periode", "Iklan Dilihat", "Tingkat Konversi (%)", "Biaya Iklan Aktual (Rp)", "ROAS Aktual", "Catatan Evaluasi"];
  const rows = snapshots.map((snapshot) => [
    snapshot.savedAt ? new Date(snapshot.savedAt).toLocaleString("id-ID") : "",
    snapshot.periodLabel || "",
    snapshot.iklanDilihat,
    round2(snapshot.tingkatKonversi),
    Math.round(snapshot.biayaIklanAktual),
    round2(snapshot.roasAktual),
    snapshot.note || "",
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n")}`;
}

export function historiFromLabels(
  labels: Record<string, number | null>,
  periodLabel: string,
  note: string,
  savedAt = Date.now(),
): HistoriRead | null {
  const sales = labels.Penjualan;
  const adSpend = labels["Biaya Iklan"];
  const impressions = labels["Iklan Dilihat"];
  if (typeof sales !== "number" || typeof adSpend !== "number" || typeof impressions !== "number") return null;
  const biayaIklanAktual = 1.11 * adSpend;
  const clicks = labels["Jumlah Klik"];
  const orders = labels.Pesanan;
  let tingkatKonversi: number | null = null;
  let missingConversion = false;
  if (typeof orders === "number" && typeof clicks === "number" && clicks > 0) tingkatKonversi = (orders / clicks) * 100;
  else if (typeof labels["Tingkat Konversi"] === "number") tingkatKonversi = labels["Tingkat Konversi"];
  else missingConversion = true;
  return {
    missingConversion,
    snapshot: {
      savedAt,
      periodLabel,
      iklanDilihat: impressions,
      tingkatKonversi,
      biayaIklanAktual,
      roasAktual: biayaIklanAktual > 0 ? sales / biayaIklanAktual : null,
      note: note.trim(),
    },
  };
}

export function findPeriodLabel(root: ParentNode): string {
  for (const node of root.querySelectorAll("div, span, button, p")) {
    if (node.children.length > 1) continue;
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (PERIOD_RE.test(text)) return text;
  }
  return "";
}

const LABEL_KEYS = ["Penjualan", "Sales", "Biaya Iklan", "Expense", "Iklan Dilihat", "Impressions", "Jumlah Klik", "Clicks", "Pesanan", "Orders", "Tingkat Konversi", "Conversion Rate"];

function canonicalLabel(raw: string): string {
  const aliases: Record<string, string> = {
    Sales: "Penjualan",
    Expense: "Biaya Iklan",
    Impressions: "Iklan Dilihat",
    Clicks: "Jumlah Klik",
    Orders: "Pesanan",
    "Conversion Rate": "Tingkat Konversi",
  };
  return aliases[raw] || raw;
}

export function readHistoriLabels(root: ParentNode): Record<string, number | null> {
  const labels: Record<string, number | null> = {};
  const container = root.querySelector('.line-metrics[data-testid="line-metrics"]');
  if (!container) return labels;
  for (const item of container.querySelectorAll(".metric-item")) {
    const raw = (item.querySelector(".top .title")?.textContent || "").trim();
    if (!LABEL_KEYS.includes(raw)) continue;
    const valueText = item.querySelector(".content .text")?.textContent || "";
    const cleaned = valueText.replace(/rp/i, "").replace("%", "").trim().replace(/\./g, "").replace(",", ".");
    const value = Number(cleaned);
    labels[canonicalLabel(raw)] = Number.isFinite(value) && cleaned ? value : null;
  }
  return labels;
}

type HistoriMap = Record<string, HistoriSnapshot[]>;

function storageArea(): chrome.storage.LocalStorageArea | null {
  if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  return null;
}

export async function loadHistori(productId: string): Promise<HistoriSnapshot[]> {
  const map = await loadHistoriMap();
  return map[productId] || [];
}

export async function saveHistori(productId: string, list: HistoriSnapshot[]): Promise<void> {
  const map = await loadHistoriMap();
  map[productId] = list;
  await saveHistoriMap(map);
}

async function loadHistoriMap(): Promise<HistoriMap> {
  const area = storageArea();
  if (area) {
    const stored = await area.get(KEY);
    return (stored[KEY] as HistoriMap) || {};
  }
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as HistoriMap;
  } catch {
    return {};
  }
}

async function saveHistoriMap(map: HistoriMap): Promise<void> {
  const area = storageArea();
  if (area) {
    await area.set({ [KEY]: map });
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(map));
}
