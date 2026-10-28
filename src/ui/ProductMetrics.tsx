import { itemMetrics, shopAgeBucket } from "../shared/analytics";
import { formatMoney } from "../shared/money";
import type { Market, ScoutItem } from "../shared/types";

function num(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("id-ID");
}

export function ProductMetrics({ item, market }: { item: ScoutItem; market: Market }) {
  const metrics = itemMetrics(item);
  const shopAge = shopAgeBucket(item.shopCtime);
  const cells: Array<[string, string]> = [
    ["Per bulan", num(metrics.soldPerMonth)],
    ["Omset/bulan", metrics.omsetPerBulan == null ? "—" : formatMoney(metrics.omsetPerBulan, market)],
    ["30 hari", num(metrics.sold30d)],
    ["Omset 30", metrics.omset30d == null ? "—" : formatMoney(metrics.omset30d, market)],
    ["Trend", metrics.trendPct == null ? "—" : `${metrics.trendPct >= 0 ? "+" : ""}${metrics.trendPct.toFixed(0)}%`],
    ["Terjual", num(item.sold)],
    ["Total omset", metrics.totalOmset == null ? "—" : formatMoney(metrics.totalOmset, market)],
    ["Wishlist", num(item.wishlist)],
    ["Ulasan", num(item.ratingCount)],
    ["Usia", metrics.ageDays == null ? "—" : `${Math.round(metrics.ageDays)} hr`],
  ];
  if (item.stock != null) cells.push(["Stok", num(item.stock)]);
  if (metrics.stockValue != null) cells.push(["Nilai stok", formatMoney(metrics.stockValue, market)]);
  if (shopAge) cells.push(["Umur toko", shopAge]);
  return (
    <div>
      <div className="ea-kicker" style={{ marginTop: 10 }}>
        Analisa
      </div>
      <div className="ea-metrics">
        {cells.map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
