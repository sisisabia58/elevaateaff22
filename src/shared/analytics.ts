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

export type SearchOverview = {
  marketSize: number | null;
  priceMin: number | null;
  priceMax: number | null;
  ageMinDays: number | null;
  ageMaxDays: number | null;
  trendPct: number | null;
};

export type ShopOverview = {
  omsetPerBulan: number | null;
  omset30d: number | null;
  sold30d: number | null;
  soldPerMonth: number | null;
  priceMin: number | null;
  priceMax: number | null;
};

export function searchOverview(items: ScoutItem[], nowMs = Date.now()): SearchOverview {
  const metrics = items.map((item) => itemMetrics(item, nowMs));
  const prices = items.map((item) => item.price).filter((price) => price > 0);
  const ages = metrics.map((row) => row.ageDays).filter((age): age is number => age !== null && age >= 0);
  const trends = metrics.map((row) => row.trendPct).filter((trend): trend is number => trend !== null);
  const sized = metrics.some((row) => row.omset30d !== null);
  return {
    marketSize: sized ? metrics.reduce((sum, row) => sum + (row.omset30d ?? 0), 0) : null,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    ageMinDays: ages.length ? Math.min(...ages) : null,
    ageMaxDays: ages.length ? Math.max(...ages) : null,
    trendPct: trends.length ? Math.round(trends.reduce((sum, value) => sum + value, 0) / trends.length) : null,
  };
}

export function shopOverview(items: ScoutItem[], nowMs = Date.now()): ShopOverview {
  const metrics = items.map((item) => itemMetrics(item, nowMs));
  const prices = items.map((item) => item.price).filter((price) => price > 0);
  const monthly = metrics.some((row) => row.omsetPerBulan !== null);
  const recent = metrics.some((row) => row.omset30d !== null);
  const sold = metrics.some((row) => row.sold30d !== null);
  const pace = metrics.some((row) => row.soldPerMonth !== null);
  return {
    omsetPerBulan: monthly ? metrics.reduce((sum, row) => sum + (row.omsetPerBulan ?? 0), 0) : null,
    omset30d: recent ? metrics.reduce((sum, row) => sum + (row.omset30d ?? 0), 0) : null,
    sold30d: sold ? metrics.reduce((sum, row) => sum + (row.sold30d ?? 0), 0) : null,
    soldPerMonth: pace ? metrics.reduce((sum, row) => sum + (row.soldPerMonth ?? 0), 0) : null,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
  };
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

export type HistogramY =
  | "count"
  | "sold30d"
  | "omset30d"
  | "omsetPerBulan"
  | "totalSold"
  | "totalOmset"
  | "wishlist"
  | "trendPct";

export type MetricBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
  sold30d: number;
  omset30d: number;
  omsetPerBulan: number;
  totalSold: number;
  totalOmset: number;
  wishlist: number;
  trendSum: number;
  trendCount: number;
};

export type HistogramDimension = "price" | "age" | "shopAge";

function blankBucket(min: number, max: number): MetricBucket {
  return {
    label: "",
    min,
    max,
    count: 0,
    sold30d: 0,
    omset30d: 0,
    omsetPerBulan: 0,
    totalSold: 0,
    totalOmset: 0,
    wishlist: 0,
    trendSum: 0,
    trendCount: 0,
  };
}

type HistogramRow = {
  value: number;
  sold30d: number;
  omset30d: number;
  omsetPerBulan: number;
  totalSold: number;
  totalOmset: number;
  wishlist: number;
  trendPct: number | null;
};

function histogramRow(item: ScoutItem, metrics: ItemMetrics, value: number): HistogramRow {
  return {
    value,
    sold30d: metrics.sold30d ?? 0,
    omset30d: metrics.omset30d ?? 0,
    omsetPerBulan: metrics.omsetPerBulan ?? 0,
    totalSold: item.sold ?? 0,
    totalOmset: metrics.totalOmset ?? 0,
    wishlist: item.wishlist ?? 0,
    trendPct: metrics.trendPct,
  };
}

function absorb(bucket: MetricBucket, row: Omit<HistogramRow, "value">) {
  bucket.count += 1;
  bucket.sold30d += row.sold30d;
  bucket.omset30d += row.omset30d;
  bucket.omsetPerBulan += row.omsetPerBulan;
  bucket.totalSold += row.totalSold;
  bucket.totalOmset += row.totalOmset;
  bucket.wishlist += row.wishlist;
  if (row.trendPct != null) {
    bucket.trendSum += row.trendPct;
    bucket.trendCount += 1;
  }
}

export function bucketMeasure(bucket: MetricBucket, metric: HistogramY): number {
  if (metric === "count") return bucket.count;
  if (metric === "trendPct") return bucket.trendCount ? bucket.trendSum / bucket.trendCount : 0;
  return bucket[metric];
}

const SHOP_AGE_LABELS = ["<3 bln", "3–6 bln", "6 bln–1 thn", "1–2 thn", "2–5 thn", ">5 thn"];

/** SENA histogram edges: quantile positions, then drop edges that are not strictly increasing. */
export function quantileEdges(sortedValues: number[], binCount: number): number[] | null {
  if (!sortedValues.length || binCount < 1) return null;
  const edges: number[] = [];
  for (let index = 0; index <= binCount; index += 1) {
    const position = (sortedValues.length - 1) * (index / binCount);
    const low = Math.floor(position);
    const high = Math.ceil(position);
    edges.push(low === high ? sortedValues[low] : sortedValues[low] + (sortedValues[high] - sortedValues[low]) * (position - low));
  }
  const deduped: number[] = [];
  for (const edge of edges) {
    if (!deduped.length || edge > deduped[deduped.length - 1]) deduped.push(edge);
  }
  return deduped.length >= 2 ? deduped : null;
}

function bucketIndexForValue(value: number, bars: Array<{ min: number; max: number }>): number {
  const index = bars.findIndex((bar) => value >= bar.min && value < bar.max);
  return index >= 0 ? index : bars.length - 1;
}

function numericHistogram(rows: HistogramRow[], bucketCount: number, format: (min: number, max: number) => string): MetricBucket[] {
  if (!rows.length) return [];
  const sorted = [...rows].sort((left, right) => left.value - right.value);
  const values = sorted.map((row) => row.value);
  const edges = quantileEdges(values, Math.min(bucketCount, values.length)) ?? [values[0], values[values.length - 1] + 1];
  const buckets = Array.from({ length: edges.length - 1 }, (_, index) => blankBucket(edges[index], edges[index + 1]));
  for (const row of sorted) absorb(buckets[bucketIndexForValue(row.value, buckets)], row);
  return buckets.map((bucket) => ({ ...bucket, label: format(bucket.min, bucket.max) }));
}

export function metricHistogram(
  items: ScoutItem[],
  nowMs = Date.now(),
  bucketCount = 6,
  dimension: HistogramDimension = "price",
  shopCtimes: Record<string, number> = {},
): MetricBucket[] {
  if (!items.length) return [];
  const metrics = metricsFor(items, nowMs);
  if (dimension === "shopAge") {
    const buckets = new Map(SHOP_AGE_LABELS.map((label) => [label, { ...blankBucket(0, 0), label }]));
    for (const item of items) {
      const label = shopAgeBucket(item.shopCtime ?? shopCtimes[item.shopId], nowMs);
      const bucket = label ? buckets.get(label) : undefined;
      const rowMetrics = metrics.get(item.itemId);
      if (!bucket || !rowMetrics) continue;
      absorb(bucket, histogramRow(item, rowMetrics, 0));
    }
    return SHOP_AGE_LABELS.map((label) => buckets.get(label)!).filter((bucket) => bucket.count > 0);
  }
  const rows = items.flatMap((item) => {
    const rowMetrics = metrics.get(item.itemId);
    const value = dimension === "price" ? item.price : rowMetrics?.ageDays;
    if (value == null || !rowMetrics) return [];
    return [histogramRow(item, rowMetrics, value)];
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
  return bucketIndexForValue(value, bars);
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
