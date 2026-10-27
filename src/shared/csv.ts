import { metricsFor, shopAgeBucket } from "./analytics";
import type { CommissionView, ScoutItem } from "./types";

function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function scoutCsv(items: ScoutItem[], commissions: Record<string, CommissionView>): string {
  const header = ["nama", "harga", "terjual", "komisi", "rate_persen", "sumber", "iklan", "sample", "xtra_persen", "affiliate_7_hari", "stok", "link"];
  const rows = items.map((item) => {
    const commission = commissions[item.itemId];
    return [
      item.name,
      item.price,
      item.sold ?? "",
      commission?.amount ?? "",
      commission?.ratePct ?? "",
      commission?.source ?? "",
      item.isAd ? "ya" : "tidak",
      commission?.freeSample === null || commission?.freeSample === undefined ? "" : commission.freeSample ? "ya" : "tidak",
      commission?.xtraRatePct ?? "",
      commission?.promotedLast7d ?? "",
      item.stock ?? "",
      item.url,
    ];
  });
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export function analyticsCsv(
  items: ScoutItem[],
  commissions: Record<string, CommissionView>,
  shopCtimes: Record<string, number> = {},
  nowMs = Date.now(),
): string {
  const metrics = metricsFor(items, nowMs);
  const header = [
    "nama",
    "toko",
    "harga",
    "stok",
    "nilai_stok",
    "terjual",
    "terjual_bulan",
    "penjualan_30",
    "omset_bulan",
    "omset_30",
    "total_omset",
    "trend_30",
    "usia_listing_hari",
    "umur_toko",
    "rating",
    "jumlah_ulasan",
    "wishlist",
    "komisi",
    "rate_persen",
    "sample",
    "affiliate_7_hari",
    "iklan",
    "kata_kunci",
    "mode_iklan",
    "bagian_omzet_toko",
    "bagian_market",
    "link",
  ];
  const rows = items.map((item) => {
    const metric = metrics.get(item.itemId);
    const commission = commissions[item.itemId];
    const shopTime = item.shopCtime ?? shopCtimes[item.shopId] ?? null;
    return [
      item.name,
      item.shopName ?? "",
      item.price,
      item.stock ?? "",
      metric?.stockValue ?? "",
      item.sold ?? "",
      metric?.soldPerMonth == null ? "" : Math.round(metric.soldPerMonth),
      metric?.sold30d ?? "",
      metric?.omsetPerBulan == null ? "" : Math.round(metric.omsetPerBulan),
      metric?.omset30d ?? "",
      metric?.totalOmset ?? "",
      metric?.trendPct == null ? "" : metric.trendPct.toFixed(1),
      metric?.ageDays == null ? "" : Math.round(metric.ageDays),
      shopAgeBucket(shopTime, nowMs) ?? "",
      item.rating ?? "",
      item.ratingCount ?? "",
      item.wishlist ?? "",
      commission?.amount ?? "",
      commission?.ratePct ?? "",
      commission?.freeSample == null ? "" : commission.freeSample ? "ya" : "tidak",
      commission?.promotedLast7d ?? "",
      item.isAd ? "ya" : "tidak",
      item.adKeyword ?? (item.isAd ? "Slot iklan" : ""),
      item.adMode ?? "",
      metric?.shopOmzetSharePct == null ? "" : metric.shopOmzetSharePct.toFixed(1),
      metric?.marketSharePct == null ? "" : metric.marketSharePct.toFixed(1),
      item.url,
    ];
  });
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, contents: string, type = "text/csv;charset=utf-8") {
  downloadBlob(filename, new Blob([contents], { type }));
}
