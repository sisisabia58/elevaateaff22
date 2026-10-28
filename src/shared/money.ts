import type { Market } from "./types";

const ID: Market = { code: "IDR", symbol: "Rp", locale: "id-ID" };
const MY: Market = { code: "MYR", symbol: "RM", locale: "en-MY" };

export function marketFromHost(host: string): Market {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  if (normalized === "shopee.com.my" || normalized.endsWith(".shopee.com.my")) return MY;
  return ID;
}

/** Shopee item prices are integers in 1/100000 of the major currency. */
export function shopeeRawToMajor(raw: number | null | undefined): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
  return raw / 100_000;
}

export function formatMoney(amount: number, market: Market): string {
  if (!Number.isFinite(amount)) return `${market.symbol} —`;
  const digits = market.code === "MYR" ? 2 : 0;
  const formatted = Math.abs(amount).toLocaleString(market.locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const body = market.code === "MYR" ? `${market.symbol} ${formatted}` : `${market.symbol}${formatted}`;
  return amount < 0 ? `–${body}` : body;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("id-ID");
}

export function formatRate(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}%` : `${rounded.toFixed(1)}%`;
}

export function estimateCommission(price: number, ratePct: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(ratePct) || price <= 0 || ratePct <= 0) return 0;
  return (price * ratePct) / 100;
}
