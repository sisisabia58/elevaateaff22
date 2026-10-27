import { shopeeRawToMajor } from "./money";
import type { PageKind, ScoutItem } from "./types";

export function isStoreHost(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return normalized === "shopee.co.id" || normalized === "shopee.com.my";
}

export function affiliateOriginFor(host: string): string {
  return host.toLowerCase().includes("shopee.com.my")
    ? "https://affiliate.shopee.com.my"
    : "https://affiliate.shopee.co.id";
}

export function parseShopeeIds(href: string): { shopId: string; itemId: string } | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const path = url.pathname;
  const dotted = path.match(/-i\.(\d+)\.(\d+)/);
  if (dotted) return { shopId: dotted[1], itemId: dotted[2] };
  const product = path.match(/\/product\/(\d+)\/(\d+)/);
  if (product) return { shopId: product[1], itemId: product[2] };
  return null;
}

export function classifyLocation(href: string): PageKind {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return "other";
  }
  if (!isStoreHost(url.hostname)) return "other";
  if (parseShopeeIds(href)) return "product";
  const path = url.pathname;
  if (path === "/" || path === "") return "other";
  if (/^\/(cart|buyer|user|checkout|help|login|verify|coins|flash_sale|mall)(\/|$)/.test(path)) return "other";
  if (path.startsWith("/search") || url.searchParams.has("keyword")) return "search";
  return "shop";
}

export function productUrl(origin: string, shopId: string, itemId: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/product/${shopId}/${itemId}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function imageUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  if (/^https?:\/\//.test(raw)) return raw;
  return `https://down-id.img.susercontent.com/${raw}`;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseApproxSoldText(value: string | null | undefined): number | null {
  if (!value) return null;
  const token = value.trim().toUpperCase();
  const scaled = token.match(/([\d.,]+)\s*(RB|JT)/);
  if (scaled) {
    const num = Number(scaled[1].replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(num)) return null;
    return Math.round(num * (scaled[2] === "JT" ? 1_000_000 : 1_000));
  }
  const plain = token.match(/[\d.,]+/);
  if (!plain) return null;
  const num = Number(plain[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(num) ? Math.round(num) : null;
}

function soldCount(item: Record<string, unknown>, soldInfo: Record<string, unknown>): number | null {
  const numeric =
    finiteNumber(soldInfo.historical_sold_count) ??
    finiteNumber(soldInfo.rounded_global_historical_sold_count) ??
    finiteNumber(soldInfo.rounded_local_historical_sold_count) ??
    finiteNumber(soldInfo.display_sold_count) ??
    finiteNumber(item.global_sold) ??
    finiteNumber(item.historical_sold) ??
    finiteNumber(item.sold);
  if (numeric !== null) return numeric;
  return parseApproxSoldText(
    text(soldInfo.historical_sold_count_text) ??
      text(soldInfo.local_historical_sold_count_text) ??
      text(soldInfo.global_historical_sold_count_text) ??
      text(item.historical_sold_text),
  );
}

function monthlySoldCount(item: Record<string, unknown>, soldInfo: Record<string, unknown>): { count: number | null; label: string | null } {
  const label =
    text(soldInfo.monthly_sold_count_text) ??
    text(soldInfo.local_monthly_sold_count_text) ??
    text(item.monthly_sold_count_text);
  const numeric =
    finiteNumber(soldInfo.monthly_sold_count) ??
    finiteNumber(soldInfo.rounded_local_monthly_sold_count) ??
    finiteNumber(soldInfo.rounded_global_monthly_sold_count) ??
    finiteNumber(item.monthly_sold_count) ??
    finiteNumber(item.monthly_sold);
  if (numeric !== null) return { count: numeric, label };
  const fromText = parseApproxSoldText(label);
  if (fromText !== null) return { count: fromText, label };
  const globalSold = finiteNumber(item.global_sold);
  const historical = finiteNumber(item.historical_sold);
  const recent = finiteNumber(item.sold);
  if (globalSold !== null && recent !== null) return { count: recent, label };
  if (historical !== null && recent !== null && recent < historical) return { count: recent, label };
  return { count: null, label };
}

function ratingCountOf(bag: Record<string, unknown> | null): number | null {
  const raw = bag?.rating_count;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (!Array.isArray(raw)) return null;
  const total = raw.reduce((sum, value) => sum + (typeof value === "number" ? value : 0), 0);
  return total > 0 ? total : null;
}

function trackingRecord(row: Record<string, unknown>, item: Record<string, unknown>): Record<string, unknown> | null {
  const raw = row.search_item_tracking ?? row.bff_item_tracking ?? item.search_item_tracking ?? item.bff_item_tracking;
  if (typeof raw === "string") {
    try {
      return asRecord(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  return asRecord(raw);
}

export function parseScoutEntry(entry: unknown, origin: string, fallbackShopId?: string): ScoutItem | null {
  const wrapped = asRecord(entry);
  if (!wrapped) return null;
  const nested = asRecord(wrapped.data);
  const row =
    wrapped.itemid == null && wrapped.item_id == null && nested && (nested.itemid != null || nested.item_id != null)
      ? nested
      : wrapped;
  const item = asRecord(row.item_data) ?? asRecord(row.item_basic) ?? asRecord(row.item) ?? row;
  const displayed = asRecord(row.item_card_displayed_asset);
  const priceBag = asRecord(item.item_card_display_price) ?? asRecord(row.item_card_display_price) ?? {};
  const soldBag = asRecord(item.item_card_display_sold_count) ?? asRecord(row.item_card_display_sold_count) ?? {};
  const itemId = item.itemid ?? item.item_id ?? row.itemid;
  const shopId = item.shopid ?? item.shop_id ?? row.shopid ?? fallbackShopId;
  if (itemId == null || shopId == null) return null;
  const rawPrice =
    priceBag.applied_product_promo_price ?? priceBag.price ?? item.price ?? item.price_min ?? row.price;
  const price = typeof rawPrice === "number" ? shopeeRawToMajor(rawPrice) : null;
  if (price === null) return null;
  const name = text(displayed?.name) ?? text(item.name) ?? text(item.title) ?? text(row.name);
  if (!name) return null;
  const ratingBag = asRecord(item.item_rating) ?? asRecord(row.item_rating);
  const rating = typeof ratingBag?.rating_star === "number" ? ratingBag.rating_star : null;
  const shopData = asRecord(item.shop_data) ?? asRecord(row.shop_data);
  const displayedImages = Array.isArray(displayed?.images) ? displayed.images[0] : null;
  const itemImages = Array.isArray(item.images) ? item.images[0] : null;
  const image = imageUrl(displayed?.image) ?? imageUrl(displayedImages) ?? imageUrl(item.image) ?? imageUrl(itemImages);
  const icon = asRecord(displayed?.icon_in_image);
  const tracked = trackingRecord(row, item);
  const matched = Array.isArray(tracked?.matched_keywords) ? tracked.matched_keywords.find((value) => typeof value === "string") : null;
  const adKeyword = text(row.ads_keyword) ?? text(item.ads_keyword) ?? text(matched);
  const adMode = row.match_type ?? item.match_type ?? row.campaignid ?? item.campaignid;
  const isAd = Boolean(row.adsid || item.adsid || row.ad_id || text(icon?.ads_text) || tracked?.is_ads || adKeyword);
  const monthly = monthlySoldCount(item, soldBag);
  const stock = finiteNumber(item.stock) ?? finiteNumber(row.stock);
  const soldOutFlag = item.is_sold_out ?? row.is_sold_out ?? item.sold_out ?? row.sold_out;
  return {
    itemId: String(itemId),
    shopId: String(shopId),
    name,
    price,
    sold: soldCount(item, soldBag),
    rating,
    image,
    shopName: text(shopData?.shop_name) ?? text(item.shop_name) ?? text(row.shop_name),
    isAd,
    url: productUrl(origin, String(shopId), String(itemId)),
    stock,
    monthlySold: monthly.count,
    monthlySoldText: monthly.label,
    soldText:
      text(soldBag.historical_sold_count_text) ??
      text(soldBag.local_historical_sold_count_text) ??
      text(item.historical_sold_text),
    ctime: finiteNumber(item.ctime) ?? finiteNumber(row.ctime),
    ratingCount: ratingCountOf(ratingBag),
    wishlist: finiteNumber(item.liked_count) ?? finiteNumber(row.liked_count) ?? finiteNumber(item.likedCount),
    soldOut: typeof soldOutFlag === "boolean" ? soldOutFlag : stock === 0 ? true : stock !== null && stock > 0 ? false : null,
    adKeyword,
    adMode: adMode == null || adMode === "" ? null : String(adMode),
    images: [displayed?.image, ...(Array.isArray(displayed?.images) ? displayed.images : []), item.image, ...(Array.isArray(item.images) ? item.images : [])]
      .map((value) => imageUrl(value))
      .filter((value): value is string => Boolean(value)),
  };
}

export function extractItemList(payload: unknown): unknown[] | null {
  const root = asRecord(payload);
  if (!root) return null;
  const data = asRecord(root.data);
  const firstSection = Array.isArray(data?.sections) ? asRecord(data.sections[0]) : null;
  const sectionItems = asRecord(firstSection?.data)?.item;
  const candidates = [
    root.items,
    data?.items,
    sectionItems,
    asRecord(root.centralize_item_card)?.item_cards,
    asRecord(data?.centralize_item_card)?.item_cards,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  if (data?.item) return [data.item];
  if (root.item) return [root.item];
  if (data && (data.itemid || data.item_id) && data.name) return [data];
  return null;
}

export function listKindFromUrl(rawUrl: string): "search" | "shop" | "category" | null {
  if (rawUrl.includes("/api/v4/search/search_items")) {
    try {
      if (new URL(rawUrl, "https://shopee.co.id").searchParams.get("scenario") === "PAGE_CATEGORY") return "category";
    } catch {
      /* keep search */
    }
    return "search";
  }
  if (rawUrl.includes("/api/v4/shop/rcmd_items") || rawUrl.includes("/api/v4/shop/search_items")) return "shop";
  if (rawUrl.includes("/api/v4/recommend/recommend") && rawUrl.includes("shop_page_product_tab_main")) return "shop";
  return null;
}

export function isProductDetailUrl(rawUrl: string): boolean {
  return (
    rawUrl.includes("/api/v4/item/get") ||
    rawUrl.includes("/api/v4/pdp/get_pc") ||
    rawUrl.includes("/api/v4/pdp/get")
  );
}
