import type { ScoutItem } from "./types";

export type ItemMetrics = {
  ageDays: number | null;
  soldPerMonth: number | null;
  sold30d: number | null;
  trendPct: number | null;
  omset30d: number | null;
  omsetPerBulan: number | null;
  totalOmset: number | null;
  stockValue: number | null;
  shopOmzetSharePct: number | null;
  marketSharePct: number | null;
};

export type PageAnalytics = {
  count: number;
  totalSold: number;
  averagePrice: number;
  averageTrend: number | null;
  averageSoldPerMonth: number | null;
  adCount: number;
};

const DAY = 86400;

export function itemMetrics(item: ScoutItem, nowMs = Date.now()): ItemMetrics {
  const ageDays = item.ctime && item.ctime > 0 ? (nowMs / 1000 - item.ctime) / DAY : null;
  const totalSold = item.sold;
  const soldPerMonth =
    ageDays !== null && totalSold !== null ? totalSold / Math.max(ageDays / 30, 1 / 30) : null;
  const sold30Raw = item.monthlySold ?? null;
  const unreliable = sold30Raw === 1 && soldPerMonth !== null && Math.round(soldPerMonth) === 1;
  const sold30d = sold30Raw !== null && !unreliable ? sold30Raw : null;
  const trendPct =
    sold30d !== null && ageDays !== null && ageDays > 60 && soldPerMonth !== null && soldPerMonth >= 5
      ? ((sold30d - soldPerMonth) / soldPerMonth) * 100
      : null;
  const price = item.price > 0 ? item.price : null;
  return {
    ageDays,
    soldPerMonth,
    sold30d,
    trendPct,
    omset30d: price !== null && sold30d !== null ? price * sold30d : null,
    omsetPerBulan: price !== null && soldPerMonth !== null ? price * soldPerMonth : null,
    totalOmset: price !== null && totalSold !== null ? price * totalSold : null,
    stockValue: item.stock != null && price !== null ? item.stock * price : null,
    shopOmzetSharePct: null,
    marketSharePct: null,
  };
}

export function metricsFor(items: ScoutItem[], nowMs = Date.now()): Map<string, ItemMetrics> {
  const base = new Map(items.map((item) => [item.itemId, itemMetrics(item, nowMs)]));
  const shopOmzet = items.reduce((sum, item) => sum + (base.get(item.itemId)?.totalOmset ?? 0), 0);
  const market = items.reduce((sum, item) => sum + (base.get(item.itemId)?.omset30d ?? 0), 0);
  for (const item of items) {
    const metrics = base.get(item.itemId);
    if (!metrics) continue;
    metrics.shopOmzetSharePct = shopOmzet > 0 && metrics.totalOmset !== null ? (metrics.totalOmset / shopOmzet) * 100 : null;
    metrics.marketSharePct = market > 0 && metrics.omset30d !== null ? (metrics.omset30d / market) * 100 : null;
  }
  return base;
}

export function shopAgeBucket(ctime: number | null | undefined, nowMs = Date.now()): string | null {
  if (!ctime || ctime <= 0) return null;
  const days = (nowMs / 1000 - ctime) / DAY;
  if (days < 90) return "<3 bln";
  if (days < 180) return "3–6 bln";
  if (days < 365) return "6 bln–1 thn";
  if (days < 730) return "1–2 thn";
  if (days < 1825) return "2–5 thn";
  return ">5 thn";
}

export function pageAnalytics(items: ScoutItem[], nowMs = Date.now()): PageAnalytics {
  const metrics = items.map((item) => itemMetrics(item, nowMs));
  const trends = metrics.map((row) => row.trendPct).filter((value): value is number => value !== null);
  const monthly = metrics.map((row) => row.soldPerMonth).filter((value): value is number => value !== null);
  const totalSold = items.reduce((sum, item) => sum + (item.sold ?? 0), 0);
  return {
    count: items.length,
    totalSold,
    averagePrice: items.length ? items.reduce((sum, item) => sum + item.price, 0) / items.length : 0,
    averageTrend: trends.length ? trends.reduce((sum, value) => sum + value, 0) / trends.length : null,
    averageSoldPerMonth: monthly.length ? monthly.reduce((sum, value) => sum + value, 0) / monthly.length : null,
    adCount: items.filter((item) => item.isAd).length,
  };
}

export type MetricBucket = { label: string; min: number; max: number; count: number; sold30d: number };

export type HistogramDimension = "price" | "age" | "shopAge";

const SHOP_AGE_LABELS = ["<3 bln", "3–6 bln", "6 bln–1 thn", "1–2 thn", "2–5 thn", ">5 thn"];

function numericHistogram(
  rows: Array<{ value: number; sold30d: number }>,
  bucketCount: number,
  format: (min: number, max: number) => string,
): MetricBucket[] {
  if (!rows.length) return [];
  const min = Math.min(...rows.map((row) => row.value));
  const max = Math.max(...rows.map((row) => row.value));
  const width = max === min ? 1 : (max - min) / bucketCount;
  const buckets: MetricBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const start = min + index * width;
    const end = index === bucketCount - 1 ? max : start + width;
    return { label: "", min: start, max: end, count: 0, sold30d: 0 };
  });
  for (const row of rows) {
    const index = Math.min(bucketCount - 1, Math.floor((row.value - min) / width));
    buckets[index].count += 1;
    buckets[index].sold30d += row.sold30d;
  }
  return buckets.map((bucket) => ({ ...bucket, label: format(bucket.min, bucket.max) }));
}

export function metricHistogram(
  items: ScoutItem[],
  nowMs = Date.now(),
  bucketCount = 5,
  dimension: HistogramDimension = "price",
  shopCtimes: Record<string, number> = {},
): MetricBucket[] {
  if (!items.length) return [];
  const metrics = metricsFor(items, nowMs);
  if (dimension === "shopAge") {
    const buckets = new Map(SHOP_AGE_LABELS.map((label) => [label, { label, min: 0, max: 0, count: 0, sold30d: 0 }]));
    for (const item of items) {
      const label = shopAgeBucket(item.shopCtime ?? shopCtimes[item.shopId], nowMs);
      const bucket = label ? buckets.get(label) : undefined;
      if (!bucket) continue;
      bucket.count += 1;
      bucket.sold30d += metrics.get(item.itemId)?.sold30d ?? 0;
    }
    return SHOP_AGE_LABELS.map((label) => buckets.get(label)!).filter((bucket) => bucket.count > 0);
  }
  const rows = items.flatMap((item) => {
    const value = dimension === "price" ? item.price : metrics.get(item.itemId)?.ageDays;
    if (value == null) return [];
    return [{ value, sold30d: metrics.get(item.itemId)?.sold30d ?? 0 }];
  });
  const format =
    dimension === "age"
      ? (min: number, max: number) => `${Math.round(min).toLocaleString("id-ID")}–${Math.round(max).toLocaleString("id-ID")} hr`
      : (min: number, max: number) => `${Math.round(min).toLocaleString("id-ID")}–${Math.round(max).toLocaleString("id-ID")}`;
  return numericHistogram(rows, bucketCount, format);
}

export function itemBucketIndex(
  item: ScoutItem,
  bars: MetricBucket[],
  dimension: HistogramDimension,
  nowMs = Date.now(),
  shopCtimes: Record<string, number> = {},
): number | null {
  if (!bars.length) return null;
  if (dimension === "shopAge") {
    const label = shopAgeBucket(item.shopCtime ?? shopCtimes[item.shopId], nowMs);
    if (!label) return null;
    const index = bars.findIndex((bar) => bar.label === label);
    return index >= 0 ? index : null;
  }
  const value = dimension === "price" ? item.price : itemMetrics(item, nowMs).ageDays;
  if (value == null) return null;
  const min = bars[0].min;
  const max = bars[bars.length - 1].max;
  const width = max === min ? 1 : (max - min) / bars.length;
  return Math.min(bars.length - 1, Math.floor((value - min) / width));
}

export function shopRelation(hasFollow: boolean, hasChat: boolean): "Toko sendiri" | "Toko kompetitor" {
  return !hasFollow && !hasChat ? "Toko sendiri" : "Toko kompetitor";
}

export type VariantPeriod = "all" | "d30" | "d90";

export type VariantTally = {
  sorted: Array<{ name: string; count: number }>;
  withoutVariant: number;
};

function reviewTime(row: Record<string, unknown>): number | null {
  const value = row.ctime ?? row.create_time ?? row.comment_time;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function reviewModels(row: Record<string, unknown>): string[] {
  const bags = [row.product_items, row.models, row.model_names];
  const names: string[] = [];
  for (const bag of bags) {
    if (!Array.isArray(bag)) continue;
    for (const entry of bag) {
      if (typeof entry === "string" && entry.trim()) names.push(entry.trim());
      else if (entry && typeof entry === "object") {
        const model = entry as Record<string, unknown>;
        const name = model.model_name ?? model.modelname ?? model.name ?? model.variation;
        if (typeof name === "string" && name.trim()) names.push(name.trim());
      }
    }
  }
  return names;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readTally(node: unknown): VariantTally | null {
  const record = asRecord(node);
  const list = Array.isArray(node) ? node : record && Array.isArray(record.sorted) ? record.sorted : null;
  if (!list) return null;
  const sorted = list
    .map((entry) => {
      const row = asRecord(entry);
      const name = row?.name ?? row?.model_name ?? row?.modelname;
      const count = row?.count ?? row?.total;
      if (typeof name !== "string" || typeof count !== "number") return null;
      return { name, count };
    })
    .filter((row): row is { name: string; count: number } => row !== null);
  const withoutVariant =
    record && typeof record.withoutVariant === "number"
      ? record.withoutVariant
      : record && typeof record.unspecified === "number"
        ? record.unspecified
        : 0;
  return { sorted, withoutVariant };
}

export function rankingForPeriod(data: unknown, reviews: unknown[] | undefined, period: VariantPeriod, nowMs = Date.now()): VariantTally {
  const root = asRecord(data);
  const nested = asRecord(root?.data);
  const source = nested && (nested.all || nested.d30 || nested.d90 || nested.sorted) ? nested : root;
  const direct = source ? readTally(source[period]) : null;
  if (direct) return direct;
  const hasKeyed = Boolean(source && (source.all || source.d30 || source.d90));
  if (reviews?.length && (!hasKeyed || !direct)) return tallyReviews(reviews, period, nowMs);
  const single = source ? readTally(source) : null;
  if (single && period === "all") return single;
  return { sorted: [], withoutVariant: 0 };
}

export function tallyReviews(reviews: unknown[], period: VariantPeriod, nowMs = Date.now()): VariantTally {
  const windowDays = period === "d30" ? 30 : period === "d90" ? 90 : null;
  const cutoff = windowDays === null ? null : nowMs / 1000 - windowDays * DAY;
  const counts = new Map<string, number>();
  let withoutVariant = 0;
  for (const entry of reviews) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const time = reviewTime(row);
    if (cutoff !== null && (time === null || time < cutoff)) continue;
    const models = reviewModels(row);
    if (!models.length) {
      withoutVariant += 1;
      continue;
    }
    for (const name of new Set(models)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  return { sorted, withoutVariant };
}
