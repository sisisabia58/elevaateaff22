import { itemMetrics, searchOverview, shopOverview, type HistogramDimension } from "./analytics";
import { formatAgeShort, formatBigMoney, formatMoney, formatShortMoney } from "./money";
import type { Market, ScoutItem } from "./types";

export type MarketBriefInput = {
  pageType: "search" | "category";
  keyword?: string;
  categoryLabel?: string;
  filterLabel?: string | null;
};

export type MarketAiScope = {
  items: ScoutItem[];
  filterLabel: string | null;
};

const LOOKBACK_DAYS = 45;
const LOOKAHEAD_DAYS = 365;
const FIXED_SEASONAL_MOMENTS = [
  { name: "Tahun Baru Masehi", month: 1, day: 1 },
  { name: "Valentine", month: 2, day: 14 },
  { name: "Libur Semester/Kenaikan Kelas (perkiraan, Jun-Jul)", month: 6, day: 20 },
  { name: "Tahun Ajaran Baru (perkiraan)", month: 7, day: 14 },
  { name: "Hari Kemerdekaan RI (17 Agustus)", month: 8, day: 17 },
  { name: "Harbolnas 9.9", month: 9, day: 9 },
  { name: "Harbolnas 10.10", month: 10, day: 10 },
  { name: "Halloween", month: 10, day: 31 },
  { name: "Harbolnas 11.11", month: 11, day: 11 },
  { name: "Harbolnas 12.12", month: 12, day: 12 },
  { name: "Libur Akhir Tahun/Semester (perkiraan, Desember)", month: 12, day: 20 },
  { name: "Hari Ibu", month: 12, day: 22 },
  { name: "Natal", month: 12, day: 25 },
];
const LEBARAN_DATES = ["2027-03-09", "2028-02-27", "2029-02-14"];
const LUNAR_SEASONAL_MOMENTS = [
  { name: "Ramadan", dates: ["2027-02-08", "2028-01-28"] },
  { name: "Lebaran/Idul Fitri", dates: LEBARAN_DATES },
  { name: "Mudik Lebaran (~H-7 sebelum Lebaran)", dates: LEBARAN_DATES.map((iso) => shiftIso(iso, -7)) },
  { name: "Idul Adha", dates: ["2027-05-16", "2028-05-05"] },
  { name: "Imlek", dates: ["2027-02-06", "2028-01-26", "2029-02-13"] },
];

function clip(value: string, max: number): string {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function shiftIso(iso: string, deltaDays: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + deltaDays);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function bareShort(amount: number, market: Market): string {
  return formatShortMoney(amount, market).replace(market.symbol, "").trim();
}

function labeledRange(min: number, max: number, market: Market): string {
  const prefix = market.code === "MYR" ? `${market.symbol} ` : market.symbol;
  return `${prefix}${bareShort(min, market)}-${bareShort(max, market)}`;
}

function nearestFixedDays(month: number, day: number, now: Date): number {
  let best: number | null = null;
  for (const year of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const date = new Date(year, month - 1, day);
    const diff = Math.round((date.getTime() - now.getTime()) / 86_400_000);
    if (best === null || Math.abs(diff) < Math.abs(best)) best = diff;
  }
  return best ?? 0;
}

function nearestListedDays(dates: string[], now: Date): number | null {
  let best: number | null = null;
  for (const iso of dates) {
    const date = new Date(`${iso}T00:00:00`);
    const diff = Math.round((date.getTime() - now.getTime()) / 86_400_000);
    if (best === null || Math.abs(diff) < Math.abs(best)) best = diff;
  }
  return best;
}

export function seasonalCalendarBlock(now = new Date()): string {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const entries: Array<{ name: string; diffDays: number }> = [];
  for (const moment of FIXED_SEASONAL_MOMENTS) {
    const diffDays = nearestFixedDays(moment.month, moment.day, day);
    if (diffDays >= -LOOKBACK_DAYS && diffDays <= LOOKAHEAD_DAYS) entries.push({ name: moment.name, diffDays });
  }
  for (const moment of LUNAR_SEASONAL_MOMENTS) {
    const diffDays = nearestListedDays(moment.dates, day);
    if (diffDays !== null && diffDays >= -LOOKBACK_DAYS && diffDays <= LOOKAHEAD_DAYS) entries.push({ name: moment.name, diffDays });
  }
  if (!entries.length) return "";
  entries.sort((left, right) => left.diffDays - right.diffDays);
  const lines = entries.map((entry) => {
    if (entry.diffDays === 0) return `- ${entry.name}: HARI INI`;
    if (entry.diffDays > 0) return `- ${entry.name}: ${entry.diffDays} hari lagi (~${(entry.diffDays / 30.44).toFixed(1)} bulan)`;
    return `- ${entry.name}: ${Math.abs(entry.diffDays)} hari yang lalu`;
  });
  return `\n\nKALENDER MUSIMAN (sudah dihitung dari tanggal hari ini -- PAKAI APA ADANYA, jangan dihitung ulang):\n${lines.join("\n")}`;
}

export function aiFilterLabel(
  bar: { label: string; min: number; max: number },
  dimension: HistogramDimension,
  market: Market,
): string {
  if (dimension === "shopAge") return `toko ${bar.label}`;
  if (dimension === "age") return `${formatAgeShort(bar.min, market)}-${formatAgeShort(bar.max, market)}`;
  return labeledRange(bar.min, bar.max, market);
}

function priceSpread(items: ScoutItem[], market: Market): string {
  const prices = items.map((item) => item.price).filter((price) => price > 0);
  if (!prices.length) return "(belum cukup data)";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `- ${labeledRange(min, max, market)}: ${prices.length} produk`;
  const span = max - min;
  const buckets = Array.from({ length: 6 }, (_, index) => ({
    lo: min + (span * index) / 6,
    hi: min + (span * (index + 1)) / 6,
    count: 0,
  }));
  for (const price of prices) {
    const index = Math.min(5, Math.floor(((price - min) / span) * 6));
    buckets[index].count += 1;
  }
  return buckets.map((bucket) => `- ${labeledRange(bucket.lo, bucket.hi, market)}: ${bucket.count} produk`).join("\n");
}

function topLines(items: ScoutItem[], market: Market, nowMs: number): string | null {
  const ranked = items
    .map((item) => ({ item, metrics: itemMetrics(item, nowMs) }))
    .filter((row) => row.metrics.omset30d != null && row.metrics.omset30d > 0)
    .sort((a, b) => (b.metrics.omset30d ?? 0) - (a.metrics.omset30d ?? 0))
    .slice(0, 8);
  if (!ranked.length) return null;
  return ranked
    .map(({ item, metrics }, index) => {
      const sold = metrics.sold30d == null ? "-" : `${Math.round(metrics.sold30d)} terjual/30hr`;
      const trend = metrics.trendPct == null ? "trend n/a" : `trend ${metrics.trendPct >= 0 ? "naik" : "turun"} ${Math.abs(metrics.trendPct).toFixed(0)}%`;
      return `${index + 1}. ${clip(item.name, 70)} - ${formatMoney(item.price, market)} - ${sold} - ${trend}`;
    })
    .join("\n");
}

export function marketDataBlock(items: ScoutItem[], input: MarketBriefInput, market: Market, nowMs = Date.now()): string {
  const overview = searchOverview(items, nowMs);
  const shops = new Set(items.map((item) => item.shopName || item.shopId).filter(Boolean));
  const scope = input.pageType === "category" ? `kategori: "${input.categoryLabel || "-"}"` : `keyword: "${input.keyword || "-"}"`;
  const filter = input.filterLabel ? `, DIFILTER ke rentang ${input.filterLabel}` : "";
  let upOmset = 0;
  let downOmset = 0;
  let sample = 0;
  const shopOmset = new Map<string, number>();
  let totalOmset = 0;
  for (const item of items) {
    const metrics = itemMetrics(item, nowMs);
    if (metrics.trendPct != null && metrics.omset30d != null) {
      sample += 1;
      if (metrics.trendPct >= 0) upOmset += metrics.omset30d;
      else downOmset += metrics.omset30d;
    }
    if (metrics.omset30d != null) {
      totalOmset += metrics.omset30d;
      const name = item.shopName || "(toko tidak diketahui)";
      shopOmset.set(name, (shopOmset.get(name) || 0) + metrics.omset30d);
    }
  }
  const momentumTotal = upOmset + downOmset;
  const momentum = sample && momentumTotal
    ? `- Momentum (berbobot omset): ${Math.round((upOmset / momentumTotal) * 100)}% dari omset 30 hari berasal dari produk yang trennya naik, ${Math.round((downOmset / momentumTotal) * 100)}% dari produk yang turun/stagnan (dari ${sample} produk yang datanya reliable) -- INI PERSENTASE OMSET, BUKAN persentase jumlah produk\n`
    : "";
  const topShops = [...shopOmset.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const top3 = topShops.reduce((sum, entry) => sum + entry[1], 0);
  const concentration = totalOmset && topShops.length
    ? `- Konsentrasi pasar: 3 toko teratas (${topShops.map(([name]) => name).join(", ")}) kuasai ${Math.round((top3 / totalOmset) * 100)}% dari omset 30 hari total\n`
    : "";
  const price = overview.priceMin != null && overview.priceMax != null ? labeledRange(overview.priceMin, overview.priceMax, market) : "-";
  const age = overview.ageMinDays != null && overview.ageMaxDays != null ? `${formatAgeShort(overview.ageMinDays, market)}-${formatAgeShort(overview.ageMaxDays, market)}` : "-";
  return `DATA PASAR (${scope}${filter}, ${items.length} produk dari ${shops.size} toko):
- Market size (omset 30 hari, ${input.filterLabel ? "rentang terfilter" : "seluruh hasil"}): ${overview.marketSize == null ? "-" : formatBigMoney(overview.marketSize, market)}
- Rentang harga: ${price}
- Rentang umur listing: ${age}
${momentum}${concentration}
SEBARAN HARGA (jumlah produk per rentang${input.filterLabel ? ", DALAM rentang terfilter" : ""}):
${priceSpread(items, market)}

BAHAN MENTAH -- performa teratas (by omset 30 hari), JANGAN disebut ulang satu-satu di jawabanmu, ini cuma buat kamu baca POLA-nya:
${topLines(items, market, nowMs) || "(belum cukup data)"}${seasonalCalendarBlock(new Date(nowMs))}`;
}

export function shopDataBlock(items: ScoutItem[], ownShop: boolean, market: Market, nowMs = Date.now()): string {
  const overview = shopOverview(items, nowMs);
  let up = 0;
  let down = 0;
  const ranked: Array<{ omset: number }> = [];
  let knownStock = 0;
  let soldOut = 0;
  for (const item of items) {
    const metrics = itemMetrics(item, nowMs);
    if (metrics.trendPct != null) {
      if (metrics.trendPct >= 0) up += 1;
      else down += 1;
    }
    if (metrics.omset30d != null && metrics.omset30d > 0) ranked.push({ omset: metrics.omset30d });
    if (item.soldOut != null) {
      knownStock += 1;
      if (item.soldOut) soldOut += 1;
    }
  }
  const sample = up + down;
  const momentum = sample
    ? `- Momentum: ${Math.round((up / sample) * 100)}% produk trennya naik, ${Math.round((down / sample) * 100)}% turun/stagnan (dari ${sample} produk yang datanya reliable)\n`
    : "";
  const total = ranked.reduce((sum, row) => sum + row.omset, 0);
  const top = [...ranked].sort((a, b) => b.omset - a.omset).slice(0, 5);
  const topSum = top.reduce((sum, row) => sum + row.omset, 0);
  const concentration = total && top.length
    ? `- Konsentrasi omset: ${top.length} produk teratas kuasai ${Math.round((topSum / total) * 100)}% dari omset 30 hari toko ini\n`
    : "";
  const stock = knownStock ? `- Rate stok habis: ${Math.round((soldOut / knownStock) * 100)}% dari ${knownStock} produk yang diketahui statusnya lagi "Habis" saat ini\n` : "";
  const price = overview.priceMin != null && overview.priceMax != null ? labeledRange(overview.priceMin, overview.priceMax, market) : "-";
  const role = ownShop ? "toko SENDIRI (milik user yang membaca ini)" : "toko KOMPETITOR (bukan milik user)";
  const pattern = listingPattern(items, market, nowMs);
  const leaders = shopTopLines(items, market, nowMs);
  return `DATA TOKO (${role}, ${items.length} produk kesadap dari katalog toko ini):
- Estimasi omset/bulan (rata-rata): ${overview.omsetPerBulan == null ? "-" : formatBigMoney(overview.omsetPerBulan, market)}
- Omset 30 hari terakhir: ${overview.omset30d == null ? "-" : formatBigMoney(overview.omset30d, market)}
- Rentang harga: ${price}
- Penjualan 30 hari terakhir: ${overview.sold30d == null ? "-" : `${Math.round(overview.sold30d).toLocaleString("id-ID")} terjual`}
${momentum}${concentration}${stock}
${pattern ? `POLA UMUR LISTING vs PENJUALAN (sample):\n${pattern}\n\n` : ""}BAHAN MENTAH -- performa teratas (by omset 30 hari), JANGAN disebut ulang satu-satu di jawabanmu, ini cuma buat kamu baca POLA/TEMA-nya:
${leaders || "(belum cukup data)"}${seasonalCalendarBlock(new Date(nowMs))}`;
}

function listingPattern(items: ScoutItem[], market: Market, nowMs: number): string | null {
  const rows = items
    .map((item) => ({ item, metrics: itemMetrics(item, nowMs) }))
    .filter((row) => row.metrics.ageDays != null);
  if (!rows.length) return null;
  const line = (row: (typeof rows)[number]) =>
    `${clip(row.item.name, 65)} - umur ${formatAgeShort(row.metrics.ageDays ?? 0, market)}, ${row.metrics.sold30d ?? 0} terjual/30hr`;
  const zombies = rows
    .filter((row) => (row.metrics.ageDays ?? 0) > 180 && (row.metrics.sold30d ?? 0) === 0)
    .sort((left, right) => (right.metrics.ageDays ?? 0) - (left.metrics.ageDays ?? 0))
    .slice(0, 5);
  const rising = rows
    .filter((row) => (row.metrics.ageDays ?? 0) <= 60 && (row.metrics.sold30d ?? 0) > 0)
    .sort((left, right) => (right.metrics.sold30d ?? 0) - (left.metrics.sold30d ?? 0))
    .slice(0, 5);
  const blocks: string[] = [];
  if (zombies.length) blocks.push(`Listing lama & sepi (sample, kandidat refresh/delisting):\n${zombies.map(line).join("\n")}`);
  if (rising.length) blocks.push(`Listing baru & mulai laris (sample):\n${rising.map(line).join("\n")}`);
  return blocks.length ? blocks.join("\n\n") : null;
}

function shopTopLines(items: ScoutItem[], market: Market, nowMs: number): string | null {
  const ranked = items
    .map((item) => ({ item, metrics: itemMetrics(item, nowMs) }))
    .filter((row) => row.metrics.omset30d != null && row.metrics.omset30d > 0)
    .sort((left, right) => (right.metrics.omset30d ?? 0) - (left.metrics.omset30d ?? 0))
    .slice(0, 8);
  if (!ranked.length) return null;
  return ranked
    .map(({ item, metrics }, index) => {
      const sold = metrics.sold30d == null ? "-" : `${Math.round(metrics.sold30d)} terjual/30hr`;
      return `${index + 1}. ${clip(item.name, 70)} - ${formatMoney(item.price, market)} - ${sold}`;
    })
    .join("\n");
}
