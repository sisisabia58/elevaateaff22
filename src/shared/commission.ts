import { estimateCommission } from "./money";
import type { CommissionView, LiveCommission, ScoutItem, Settings } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
    if (!cleaned) return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseCommissionPayload(raw: unknown, price: number | null): LiveCommission | null {
  const root = asRecord(raw);
  if (!root || root.code !== 0) return null;
  const data = asRecord(root.data);
  if (!data) return null;
  const rateBag = asRecord(data.commission_rate) ?? {};
  const ratePct = asNumber(rateBag.default_commission_rate);
  const xtraRatePct = asNumber(rateBag.seller_commission_rate);
  const explicitAmount = asNumber(rateBag.default_commission ?? data.commission);
  const promotedLast7d = asNumber(data.affiliate_promoted_last_7days);
  const freeSample = typeof data.is_free_sample === "boolean" ? data.is_free_sample : null;
  const amount =
    explicitAmount !== null
      ? explicitAmount
      : ratePct !== null && price !== null
        ? estimateCommission(price, ratePct)
        : null;
  if (ratePct === null || amount === null) return null;
  return { ratePct, amount, xtraRatePct, promotedLast7d, freeSample };
}

export function parseCommissionList(
  raw: unknown,
): Map<string, { ratePct: number; freeSample: boolean | null; promotedLast7d: number | null }> {
  const found = new Map<string, { ratePct: number; freeSample: boolean | null; promotedLast7d: number | null }>();
  const root = asRecord(raw);
  const data = root && "data" in root ? root.data : raw;
  const bag = asRecord(data);
  const lists = [
    bag?.list,
    bag?.item_list,
    bag?.products,
    bag?.items,
    Array.isArray(data) ? data : null,
  ];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const row = asRecord(entry);
      if (!row) continue;
      const itemId = row.item_id ?? row.itemid ?? row.itemId;
      const ratePct = asNumber(row.default_commission_rate);
      if (itemId == null || ratePct === null) continue;
      const freeSample = typeof row.is_free_sample === "boolean" ? row.is_free_sample : null;
      found.set(String(itemId), {
        ratePct,
        freeSample,
        promotedLast7d: asNumber(row.affiliate_promoted_last_7days),
      });
    }
  }
  return found;
}

export function commissionView(
  item: Pick<ScoutItem, "price">,
  settings: Settings,
  live: LiveCommission | null,
): CommissionView {
  if (live) {
    return {
      source: "live",
      ratePct: live.ratePct,
      amount: live.amount,
      note: "Dari sesi Affiliate Shopee",
      xtraRatePct: live.xtraRatePct,
      promotedLast7d: live.promotedLast7d,
      freeSample: live.freeSample,
    };
  }
  return {
    source: "estimate",
    ratePct: settings.defaultRatePct,
    amount: estimateCommission(item.price, settings.defaultRatePct),
    note: "Estimasi dari komisi default",
    xtraRatePct: null,
    promotedLast7d: null,
    freeSample: null,
  };
}

export function extractOfferLink(raw: unknown): string | null {
  const root = asRecord(raw);
  const data = asRecord(root?.data) ?? root;
  const links = data?.productOfferLinks;
  if (!Array.isArray(links) || links.length === 0) return null;
  const first = asRecord(links[0]);
  const link = first?.productOfferLink;
  return typeof link === "string" && link.startsWith("http") ? link : null;
}
