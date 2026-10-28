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
    ["30 hari", num(metrics.sold30d)],
    ["Omset 30", metrics.omset30d == null ? "—" : formatMoney(metrics.omset30d, market)],
    ["Trend", metrics.trendPct == null ? "—" : `${metrics.trendPct >= 0 ? "+" : ""}${metrics.trendPct.toFixed(0)}%`],
    ["Per bulan", num(metrics.soldPerMonth)],
    ["Terjual", num(item.sold)],
    ["Usia", metrics.ageDays == null ? "—" : `${Math.round(metrics.ageDays)} hr`],
    ["Ulasan", num(item.ratingCount)],
    ["Wishlist", num(item.wishlist)],
  ];
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
