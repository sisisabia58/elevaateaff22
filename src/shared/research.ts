import type { ScoutItem } from "./types";

export type ShopSummary = {
  count: number;
  minPrice: number;
  maxPrice: number;
  top3SharePct: number;
};

export function shopSummary(items: ScoutItem[]): ShopSummary | null {
  if (!items.length) return null;
  const prices = items.map((item) => item.price);
  const totalSold = items.reduce((sum, item) => sum + (item.sold ?? 0), 0);
  const top3 = [...items].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).slice(0, 3);
  const topSold = top3.reduce((sum, item) => sum + (item.sold ?? 0), 0);
  return {
    count: items.length,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    top3SharePct: totalSold > 0 ? (topSold / totalSold) * 100 : 0,
  };
}

export type HistogramBucket = { label: string; min: number; max: number; count: number };

export function priceHistogram(items: ScoutItem[], bucketCount = 5): HistogramBucket[] {
  if (!items.length) return [];
  const prices = items.map((item) => item.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const width = max === min ? 1 : (max - min) / bucketCount;
  const buckets: HistogramBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const start = min + index * width;
    const end = index === bucketCount - 1 ? max : start + width;
    return { label: "", min: start, max: end, count: 0 };
  });
  for (const price of prices) {
    const index = Math.min(bucketCount - 1, Math.floor((price - min) / width));
    buckets[index].count += 1;
  }
  return buckets.map((bucket) => ({
    ...bucket,
    label: `${Math.round(bucket.min).toLocaleString("id-ID")}–${Math.round(bucket.max).toLocaleString("id-ID")}`,
  }));
}

export type CreatorRow = {
  affiliateId: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function parseCreators(raw: unknown): CreatorRow[] {
  const root = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  const data = root && "data" in root ? root.data : raw;
  const bag = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const list = [bag?.list, bag?.creators, Array.isArray(data) ? data : null].find(Array.isArray) as unknown[] | undefined;
  if (!list) return [];
  const rows: CreatorRow[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const id = row.affiliate_id ?? row.affiliateId ?? row.user_id ?? row.id;
    if (id == null) continue;
    const phone = typeof row.phone === "string" ? row.phone : null;
    const email = typeof row.email === "string" ? row.email : null;
    const name = String(row.display_name ?? row.username ?? row.name ?? id);
    rows.push({ affiliateId: String(id), name, phone, email });
  }
  return rows;
}

export type PerfProduct = { name: string; sold: number; growthPct: number };

export function parsePerformance(raw: unknown): PerfProduct[] {
  const found: PerfProduct[] = [];
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 7) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    const row = value as Record<string, unknown>;
    const name = row.product_name ?? row.item_name ?? row.name;
    const sold = row.placed_units ?? row.confirmed_units ?? row.units ?? row.sales ?? row.sold;
    const growth = row.placed_units_pct_diff ?? row.sales_pct_diff ?? row.growth ?? row.grow_rate;
    if (typeof name === "string" && (typeof sold === "number" || typeof growth === "number")) {
      found.push({
        name,
        sold: typeof sold === "number" ? sold : 0,
        growthPct: typeof growth === "number" ? growth : 0,
      });
    }
    for (const child of Object.values(row)) visit(child, depth + 1);
  };
  visit(raw, 0);
  const unique = new Map<string, PerfProduct>();
  for (const row of found) if (!unique.has(row.name)) unique.set(row.name, row);
  return [...unique.values()].slice(0, 80);
}

export type IncomeParts = { price: number; income: number; fees: number; sku: string };

const PRICE_KEYS = ["product_price", "merchandise_subtotal", "original_price", "buyer_paid_product"];
const INCOME_KEYS = ["escrow_amount", "seller_income", "order_income", "final_income", "released_amount"];
const FEE_KEYS = ["commission_fee", "service_fee", "transaction_fee", "seller_transaction_fee", "ams_commission_fee"];

export function parseIncome(raw: unknown): IncomeParts | null {
  let price = 0;
  let income = 0;
  let fees = 0;
  let sku = "";
  const visit = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 7) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => visit(entry, depth + 1));
      return;
    }
    const row = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(row)) {
      const amount = typeof child === "number" ? child : null;
      const lowered = key.toLowerCase();
      if (amount !== null && amount > 0) {
        if (!price && PRICE_KEYS.some((name) => lowered.includes(name))) price = amount;
        if (!income && INCOME_KEYS.some((name) => lowered.includes(name))) income = amount;
        if (FEE_KEYS.some((name) => lowered.includes(name))) fees += amount;
      }
      if (!sku && typeof child === "string" && /sku/.test(lowered) && child.trim()) sku = child.trim();
      else visit(child, depth + 1);
    }
  };
  visit(raw, 0);
  if (!price && !income && !fees) return null;
  return { price, income, fees, sku };
}

export function broadcastDraft(kind: "cart" | "arrival" | "promo", shopName: string): string {
  const shop = shopName || "toko ini";
  if (kind === "cart") {
    return `Hai, barang di keranjang ${shop} masih menunggu. Stoknya terbatas, lanjut checkout kalau masih kamu butuhkan.`;
  }
  if (kind === "arrival") {
    return `Ada produk baru di ${shop}. Kalau kamu lagi cari yang sejenis, cek dulu sebelum kehabisan.`;
  }
  return `Ada promo di ${shop}. Diskonnya berlaku untuk pembeli terpilih, buka toko untuk lihat yang sedang jalan.`;
}
