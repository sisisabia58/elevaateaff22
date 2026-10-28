import { matchPreset, type RoasPreset } from "./presets";

/** Shopee seller-income amounts are integers in 1/100000 of the major unit. */
const RAW = 100_000;

export type FeePercents = {
  platformPct: number;
  fssPct: number;
  servicePct: number;
  promotionPct: number;
  otherPct: number | null;
  totalFees: number;
  totalPct: number;
  merchandiseSubtotal: number;
};

export type OrderItem = { qty: number; sku: string; productId: string; name: string };

export type ParsedOrderIncome = {
  netIncome: number;
  items: OrderItem[];
  fees: FeePercents | null;
};

export type OrderProfitNote = { tone: "warn" | "info"; text: string };

export type OrderProfitState = {
  netIncome: number;
  totalHpp: number;
  profit: number;
  profitPct: number | null;
  matchedCount: number;
  unmatchedCount: number;
  skuMatchedCount: number;
  itemCount: number;
  fees: FeePercents | null;
  note: OrderProfitNote | null;
};

export const FEE_BADGE_LABELS: Record<string, keyof FeePercents> = {
  "Biaya Platform": "platformPct",
  "Biaya Gratis Ongkir XTRA": "fssPct",
  "Biaya Layanan": "servicePct",
  "Biaya Promosi": "promotionPct",
  "Biaya Lainnya": "otherPct",
};

type BreakdownField = { field_name?: unknown; amount?: unknown };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function incomeRoot(raw: unknown): Record<string, unknown> | null {
  const row = asRecord(raw);
  if (!row) return null;
  const data = asRecord(row.data);
  if (data && asRecord(data.seller_income_breakdown)) return data;
  if (asRecord(row.seller_income_breakdown)) return row;
  return null;
}

function major(amount: unknown): number {
  const value = Number(amount);
  return Number.isFinite(value) ? value / RAW : 0;
}

function breakdownOf(root: Record<string, unknown>): BreakdownField[] {
  const box = asRecord(root.seller_income_breakdown);
  return Array.isArray(box?.breakdown) ? (box.breakdown as BreakdownField[]) : [];
}

export function formatOrderPct(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

export function feePercents(breakdown: BreakdownField[]): FeePercents | null {
  const get = (name: string) => major(breakdown.find((field) => field.field_name === name)?.amount);
  const base = get("MERCHANDISE_SUBTOTAL");
  if (!(base > 0)) return null;
  const platform = get("PLATFORM_FEES");
  const fss = get("FSS_FEES");
  const service = get("SERVICE_FEES");
  const promotion = get("PROMOTION_FEES");
  const other = get("OTHER_FEES");
  const pct = (value: number) => (Math.abs(value) / base) * 100;
  const totalFees = Math.abs(platform) + Math.abs(fss) + Math.abs(service) + Math.abs(promotion) + Math.abs(other);
  const hasOther = breakdown.some((field) => field.field_name === "OTHER_FEES");
  return {
    platformPct: pct(platform),
    fssPct: pct(fss),
    servicePct: pct(service),
    promotionPct: pct(promotion),
    otherPct: hasOther ? pct(other) : null,
    totalFees,
    totalPct: pct(-totalFees),
    merchandiseSubtotal: base,
  };
}

export function parseOrderIncome(raw: unknown): ParsedOrderIncome | null {
  const root = incomeRoot(raw);
  if (!root) return null;
  const breakdown = breakdownOf(root);
  const escrow = breakdown.find((field) => field.field_name === "ESCROW_AMOUNT");
  if (!escrow) return null;
  const list = asRecord(root.order_item_list);
  const rows = Array.isArray(list?.order_items) ? list.order_items : [];
  const items: OrderItem[] = rows.map((row) => {
    const item = asRecord(row) || {};
    const sku = String(item.model_sku || item.product_sku || "").trim();
    return {
      qty: Number(item.amount) || 0,
      sku,
      productId: item.item_id == null ? "" : String(item.item_id),
      name: String(item.product_name || ""),
    };
  });
  return { netIncome: major(escrow.amount), items, fees: feePercents(breakdown) };
}

export function orderProfitNote(input: {
  itemCount: number;
  matchedCount: number;
  unmatchedCount: number;
  skuMatchedCount: number;
}): OrderProfitNote | null {
  if (input.itemCount === 0) return { tone: "warn", text: "Ngga nemu data item di order ini." };
  if (input.matchedCount === 0) {
    return {
      tone: "warn",
      text: "HPP belum diset di ROAS Calculator buat produk di order ini -- profit di bawah masih sama dengan Total Penghasilan (belum dikurangi modal).",
    };
  }
  if (input.unmatchedCount > 0) {
    return {
      tone: "warn",
      text: `${input.unmatchedCount} dari ${input.itemCount} item di order ini belum ada HPP-nya (dicek dari HPP per-SKU Dashboard Profit maupun preset ROAS Calculator) -- profit di bawah cuma ngitung yang udah ada HPP-nya.`,
    };
  }
  if (input.skuMatchedCount < input.matchedCount) {
    return {
      tone: "info",
      text: `${input.matchedCount - input.skuMatchedCount} dari ${input.itemCount} item pakai estimasi HPP dari preset ROAS Calculator (belum ada HPP per-varian di Dashboard Profit).`,
    };
  }
  return null;
}

export function orderProfit(
  parsed: ParsedOrderIncome,
  hppBySku: Record<string, number>,
  presets: Record<string, RoasPreset>,
): OrderProfitState {
  let totalHpp = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;
  let skuMatchedCount = 0;
  for (const item of parsed.items) {
    const skuHpp = item.sku ? Number(hppBySku[item.sku]) : NaN;
    if (skuHpp > 0) {
      totalHpp += skuHpp * item.qty;
      matchedCount += 1;
      skuMatchedCount += 1;
      continue;
    }
    const preset = matchPreset(presets, { title: item.name, productId: item.productId })?.preset;
    if (preset?.hpp) {
      totalHpp += Number(preset.hpp) * item.qty;
      matchedCount += 1;
    } else {
      unmatchedCount += 1;
    }
  }
  const profit = parsed.netIncome - totalHpp;
  const base = parsed.fees?.merchandiseSubtotal ?? 0;
  const counts = { itemCount: parsed.items.length, matchedCount, unmatchedCount, skuMatchedCount };
  return {
    netIncome: parsed.netIncome,
    totalHpp,
    profit,
    profitPct: matchedCount > 0 && base > 0 ? (profit / base) * 100 : null,
    ...counts,
    fees: parsed.fees,
    note: orderProfitNote(counts),
  };
}

function raw(majorUnits: number): number {
  return majorUnits * RAW;
}

/** Two items: SKU1 ×2 at HPP 15.000, and a Talenan line that falls back to the ROAS preset. */
export const SAMPLE_ORDER_INCOME = {
  code: 0,
  data: {
    seller_income_breakdown: {
      breakdown: [
        { field_name: "MERCHANDISE_SUBTOTAL", amount: raw(100_000) },
        { field_name: "PLATFORM_FEES", amount: raw(-6_000) },
        { field_name: "FSS_FEES", amount: raw(-1_000) },
        { field_name: "SERVICE_FEES", amount: raw(-1_500) },
        { field_name: "PROMOTION_FEES", amount: raw(-400) },
        { field_name: "OTHER_FEES", amount: raw(-100) },
        { field_name: "ESCROW_AMOUNT", amount: raw(91_000) },
      ],
    },
    order_item_list: {
      order_items: [
        { amount: 2, model_sku: "SKU1", item_id: 1001, product_name: "Tumbler Stainless" },
        { amount: 1, product_sku: "", item_id: 88, product_name: "Talenan Kayu Jati" },
      ],
    },
  },
};
