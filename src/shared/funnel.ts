import { median } from "./roas";
import type { PerfProduct } from "./research";

export type FunnelTierKey = "star" | "cashcow" | "question" | "dog" | "unknown";
export type Bottleneck = "exposure" | "ctr" | "addtocart" | "checkout" | "sehat" | "unknown";

export const TIER_META: Record<FunnelTierKey, { label: string; color: string; desc: string }> = {
  star: { label: "⭐ Star", color: "#0f6e56", desc: "Trafik dan konversi di atas median toko." },
  cashcow: { label: "🪙 Cashcow", color: "#1d4ed8", desc: "Konversi di atas median, trafik di bawah median." },
  question: { label: "❓ Question Mark", color: "#b45309", desc: "Trafik di atas median, konversi di bawah median." },
  dog: { label: "🐕 Dog", color: "#6b7280", desc: "Trafik dan konversi di bawah median toko." },
  unknown: { label: "Data kurang", color: "#5c564e", desc: "Pengunjung atau konversi belum ada." },
};

export const DIAGNOSIS_META: Record<Bottleneck, { label: string; desc: string }> = {
  exposure: { label: "Minim eksposur", desc: "Pengunjung di bawah median toko." },
  ctr: { label: "CTR rendah", desc: "CTR di bawah median toko." },
  addtocart: { label: "Add-to-Cart rendah", desc: "Add to cart rate di bawah median toko." },
  checkout: { label: "Checkout rendah", desc: "Cart to checkout rate di bawah median toko." },
  sehat: { label: "Sehat semua tahap", desc: "Pengunjung, CTR, keranjang, dan checkout tidak di bawah median." },
  unknown: { label: "Data kurang", desc: "Angka funnel belum lengkap untuk diagnosis." },
};

const TIER_PRIORITY: Record<FunnelTierKey, number> = { star: 4, cashcow: 3, question: 2, dog: 1, unknown: 0 };

export type FunnelBench = {
  visitors: number | null;
  conv: number | null;
  ctr: number | null;
  addToCart: number | null;
  checkout: number | null;
};

export type ClassifiedProduct = PerfProduct & { tier: FunnelTierKey; diagnosis: Bottleneck };

function medianOf(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!nums.length) return null;
  return median(nums);
}

export function funnelBench(rows: PerfProduct[]): FunnelBench {
  return {
    visitors: medianOf(rows.map((row) => row.visitors)),
    conv: medianOf(rows.map((row) => row.convPct)),
    ctr: medianOf(rows.map((row) => row.ctrPct)),
    addToCart: medianOf(rows.map((row) => row.addToCartPct)),
    checkout: medianOf(rows.map((row) => row.cartToCheckoutPct)),
  };
}

function stage(value: number | null | undefined, bench: number | null): "weak" | "ok" | "missing" {
  if (value == null || Number.isNaN(value)) return "missing";
  if (bench == null) return "ok";
  return value < bench ? "weak" : "ok";
}

export function diagnose(row: PerfProduct, bench: FunnelBench): Bottleneck {
  const visitors = stage(row.visitors, bench.visitors);
  if (visitors === "missing") return "unknown";
  if (visitors === "weak") return "exposure";
  const ctr = stage(row.ctrPct, bench.ctr);
  if (ctr === "missing") return "unknown";
  if (ctr === "weak") return "ctr";
  const cart = stage(row.addToCartPct, bench.addToCart);
  if (cart === "missing") return "unknown";
  if (cart === "weak") return "addtocart";
  const checkout = stage(row.cartToCheckoutPct, bench.checkout);
  if (checkout === "missing") return "unknown";
  if (checkout === "weak") return "checkout";
  return "sehat";
}

export function classifyFunnel(row: PerfProduct, bench: FunnelBench): FunnelTierKey {
  if (row.visitors == null || row.convPct == null || bench.visitors == null || bench.conv == null) return "unknown";
  const highTraffic = row.visitors >= bench.visitors;
  const highConv = row.convPct >= bench.conv;
  if (highTraffic && highConv) return "star";
  if (highConv) return "cashcow";
  if (highTraffic) return "question";
  return "dog";
}

export function classifyPortfolio(rows: PerfProduct[]): { rows: ClassifiedProduct[]; bench: FunnelBench } {
  const bench = funnelBench(rows);
  return { bench, rows: rows.map((row) => ({ ...row, tier: classifyFunnel(row, bench), diagnosis: diagnose(row, bench) })) };
}

const TIER_KEYS = new Set<FunnelTierKey>(["star", "cashcow", "question", "dog", "unknown"]);
const DIAG_KEYS = new Set<Bottleneck>(["exposure", "ctr", "addtocart", "checkout", "sehat", "unknown"]);

export function mergeServerClass(rows: ClassifiedProduct[], data: unknown): ClassifiedProduct[] {
  const body = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const results = body && Array.isArray(body.results) ? body.results : [];
  const byId = new Map<string, { tier?: FunnelTierKey; diagnosis?: Bottleneck }>();
  for (const entry of results) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    if (row.id == null) continue;
    const tierBag = row.tier !== null && typeof row.tier === "object" ? (row.tier as Record<string, unknown>) : null;
    const diagBag = row.diagnosis !== null && typeof row.diagnosis === "object" ? (row.diagnosis as Record<string, unknown>) : null;
    const tier = typeof tierBag?.key === "string" && TIER_KEYS.has(tierBag.key as FunnelTierKey) ? (tierBag.key as FunnelTierKey) : undefined;
    const diagnosis = typeof diagBag?.key === "string" && DIAG_KEYS.has(diagBag.key as Bottleneck) ? (diagBag.key as Bottleneck) : undefined;
    byId.set(String(row.id), { tier, diagnosis });
  }
  if (!byId.size) return rows;
  return rows.map((row) => {
    const hit = row.id ? byId.get(String(row.id)) : undefined;
    if (!hit) return row;
    return { ...row, tier: hit.tier ?? row.tier, diagnosis: hit.diagnosis ?? row.diagnosis };
  });
}

export function tierRank(tier: FunnelTierKey): number {
  return TIER_PRIORITY[tier];
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function round1(value: number | null | undefined): string | number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : "";
}

export function funnelCsv(rows: ClassifiedProduct[]): string {
  const header = [
    "ID Produk",
    "Nama Produk",
    "Tier BCG",
    "Diagnosis Bottleneck",
    "Impresi",
    "Pengunjung (UV)",
    "CTR (%)",
    "Tingkat Konversi (%)",
    "Add to Cart Rate (%)",
    "Cart to Checkout Rate (%)",
  ];
  const body = rows.map((row) =>
    [
      row.id ?? "",
      row.name,
      TIER_META[row.tier].label,
      DIAGNOSIS_META[row.diagnosis].label,
      row.impressions ?? "",
      row.visitors ?? "",
      round1(row.ctrPct),
      round1(row.convPct),
      round1(row.addToCartPct),
      round1(row.cartToCheckoutPct),
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${[header.map(csvCell).join(","), ...body].join("\r\n")}`;
}

export function funnelBrief(rows: ClassifiedProduct[]): string {
  const total = rows.length;
  const pct = (count: number) => (total ? `${Math.round((count / total) * 100)}%` : "-");
  const tiers = (["star", "cashcow", "question", "dog", "unknown"] as const).map((key) => {
    const count = rows.filter((row) => row.tier === key).length;
    return `- ${TIER_META[key].label}: ${count} produk (${pct(count)})`;
  });
  const diags = (["exposure", "ctr", "addtocart", "checkout", "sehat", "unknown"] as const)
    .map((key) => {
      const count = rows.filter((row) => row.diagnosis === key).length;
      return count ? `- ${DIAGNOSIS_META[key].label}: ${count} produk (${pct(count)})` : "";
    })
    .filter(Boolean);
  return [`PORTOFOLIO (${total} produk)`, "KUADRAN", ...tiers, "BOTTLENECK", ...(diags.length ? diags : ["- belum cukup data"])].join("\n");
}
