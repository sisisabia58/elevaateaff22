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

function soldCount(item: Record<string, unknown>, soldInfo: Record<string, unknown>): number | null {
  const numeric =
    soldInfo.historical_sold_count ??
    soldInfo.display_sold_count ??
    item.historical_sold ??
    item.sold;
  return typeof numeric === "number" && Number.isFinite(numeric) ? numeric : null;
}

export function parseScoutEntry(entry: unknown, origin: string, fallbackShopId?: string): ScoutItem | null {
  const row = asRecord(entry);
  if (!row) return null;
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
  const isAd = Boolean(row.adsid || item.adsid || row.ad_id || text(icon?.ads_text));
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
    stock: typeof item.stock === "number" ? item.stock : typeof row.stock === "number" ? row.stock : null,
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
