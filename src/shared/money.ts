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

function idNumber(value: number, decimals: number, comma: boolean): string {
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  if (Number.isInteger(rounded)) return String(rounded);
  const fixed = rounded.toFixed(decimals);
  return comma ? fixed.replace(".", ",") : fixed;
}

/** SENA formatRupiahBig: Rp1,5Jt, Rp66,3Jt, Rp2,1M. */
export function formatBigMoney(amount: number, market: Market): string {
  if (!Number.isFinite(amount)) return "-";
  const comma = market.code === "IDR";
  const abs = Math.abs(amount);
  let scaled = abs;
  let suffix = "";
  if (abs >= 1_000_000_000) {
    scaled = abs / 1_000_000_000;
    suffix = market.code === "MYR" ? "B" : "M";
  } else if (abs >= 1_000_000) {
    scaled = abs / 1_000_000;
    suffix = market.code === "MYR" ? "M" : "Jt";
  } else if (abs >= 1_000) {
    scaled = abs / 1_000;
    suffix = market.code === "MYR" ? "K" : "Rb";
  }
  const body = market.code === "MYR" ? `${market.symbol} ${idNumber(scaled, 1, false)}` : `${market.symbol}${idNumber(scaled, 1, comma)}`;
  return `${amount < 0 ? "–" : ""}${body}${suffix}`;
}

/** SENA formatRibuShort: 89rb, 1,2jt, without the currency symbol. */
export function formatRibuShort(amount: number, market: Market): string {
  if (!Number.isFinite(amount)) return "-";
  const comma = market.code === "IDR";
  const abs = Math.abs(amount);
  let text = idNumber(abs, 0, comma);
  if (abs >= 1_000_000) text = idNumber(abs / 1_000_000, 1, comma) + (market.code === "MYR" ? "M" : "jt");
  else if (abs >= 1_000) text = idNumber(abs / 1_000, 1, comma) + (market.code === "MYR" ? "K" : "rb");
  return `${amount < 0 ? "–" : ""}${text}`;
}

/** SENA formatRibuShort with the currency symbol: Rp89rb, Rp1,2jt. */
export function formatShortMoney(amount: number, market: Market): string {
  if (!Number.isFinite(amount)) return "-";
  const comma = market.code === "IDR";
  const abs = Math.abs(amount);
  let text = idNumber(abs, 0, comma);
  if (abs >= 1_000_000) text = idNumber(abs / 1_000_000, 1, comma) + (market.code === "MYR" ? "M" : "jt");
  else if (abs >= 1_000) text = idNumber(abs / 1_000, 1, comma) + (market.code === "MYR" ? "K" : "rb");
  const body = market.code === "MYR" ? `${market.symbol} ${text}` : `${market.symbol}${text}`;
  return `${amount < 0 ? "–" : ""}${body}`;
}

/** SENA formatAgeShort. */
export function formatAgeShort(days: number, market: Market): string {
  if (!Number.isFinite(days)) return "-";
  if (days < 30) return `${Math.round(days)} hari`;
  if (days < 365) return `${Math.round(days / 30)} bln`;
  return `${idNumber(days / 365, 1, market.code === "IDR")} thn`;
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
