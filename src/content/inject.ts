import { SOURCE } from "../shared/types";
import {
  extractItemList,
  isProductDetailUrl,
  listKindFromUrl,
  parseScoutEntry,
  productUrl,
} from "../shared/shopee";

const channel = "page";

function post(payload: Record<string, unknown>) {
  window.postMessage({ source: SOURCE, channel, ...payload }, location.origin);
}

const scout = new Map<string, ReturnType<typeof parseScoutEntry>>();
let scoutPage: "search" | "shop" | "category" | null = null;
let scoutLabel = "";
let product: ReturnType<typeof parseScoutEntry> = null;

function publishScout() {
  post({
    type: "SCOUT",
    page: scoutPage,
    label: scoutLabel,
    items: [...scout.values()].filter(Boolean),
  });
}

function rememberProduct(entry: unknown) {
  const parsed = parseScoutEntry(entry, location.origin);
  if (!parsed) return;
  product = parsed;
  post({ type: "PRODUCT", item: parsed });
}

function rememberList(rawUrl: string, payload: unknown) {
  const kind = listKindFromUrl(rawUrl);
  if (!kind) return;
  const list = extractItemList(payload);
  if (!list) return;
  let fallbackShop: string | undefined;
  try {
    fallbackShop = new URL(rawUrl, location.href).searchParams.get("shopid") ?? undefined;
  } catch {
    fallbackShop = undefined;
  }
  if (scoutPage !== kind) {
    scout.clear();
    scoutPage = kind;
  }
  try {
    const url = new URL(rawUrl, location.href);
    scoutLabel =
      kind === "search"
        ? url.searchParams.get("keyword") || "Pencarian"
        : kind === "category"
          ? "Kategori"
          : "Toko";
  } catch {
    scoutLabel = kind;
  }
  for (const entry of list) {
    const parsed = parseScoutEntry(entry, location.origin, fallbackShop);
    if (parsed) scout.set(parsed.itemId, parsed);
  }
  publishScout();
}

function maybeAccount(rawUrl: string, json: unknown) {
  if (!/mini\/login|account\/basic|get_account_info/i.test(rawUrl)) return;
  const root = json !== null && typeof json === "object" ? (json as Record<string, unknown>) : null;
  const data = root && typeof root.data === "object" && root.data ? (root.data as Record<string, unknown>) : root;
  const id = data?.user_id ?? data?.userid ?? data?.userId;
  if (id == null) return;
  post({
    type: "ACCOUNT",
    shopeeUserId: String(id),
    username: typeof data?.username === "string" ? data.username : null,
    shopId: data?.shopid != null ? String(data.shopid) : data?.shop_id != null ? String(data.shop_id) : null,
    isSeller: location.hostname.startsWith("seller."),
  });
}

async function readJson(response: Response, rawUrl: string) {
  try {
    const json = await response.clone().json();
    maybeAccount(rawUrl, json);
    if (isProductDetailUrl(rawUrl)) {
      const list = extractItemList(json);
      if (list?.[0]) rememberProduct(list[0]);
      else rememberProduct(json);
    }
    rememberList(rawUrl, json);
  } catch {
    /* non-json response */
  }
}

const originalFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const promise = originalFetch(input, init);
    if (listKindFromUrl(rawUrl) || isProductDetailUrl(rawUrl) || /mini\/login|account\/basic|get_account_info/i.test(rawUrl)) {
    promise.then((response) => void readJson(response, rawUrl)).catch(() => undefined);
  }
  return promise;
};

const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (method: string, url: string | URL, asyncFlag?: boolean, username?: string | null, password?: string | null) {
  (this as XMLHttpRequest & { __eaUrl?: string }).__eaUrl = String(url);
  return originalOpen.call(this, method, url, asyncFlag ?? true, username, password);
};
XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
  this.addEventListener("load", () => {
    const rawUrl = (this as XMLHttpRequest & { __eaUrl?: string }).__eaUrl || "";
    if (!listKindFromUrl(rawUrl) && !isProductDetailUrl(rawUrl) && !/mini\/login|account\/basic|get_account_info/i.test(rawUrl)) return;
    try {
      const json = JSON.parse(this.responseText) as unknown;
      maybeAccount(rawUrl, json);
      rememberList(rawUrl, json);
      if (isProductDetailUrl(rawUrl)) {
        const list = extractItemList(json);
        if (list?.[0]) rememberProduct(list[0]);
      }
    } catch {
      /* ignore */
    }
  });
  return originalSend.call(this, body);
};

async function fetchItem(shopId: string, itemId: string) {
  try {
    const response = await originalFetch(
      `${location.origin}/api/v4/item/get?itemid=${encodeURIComponent(itemId)}&shopid=${encodeURIComponent(shopId)}`,
      { credentials: "include", headers: { Accept: "application/json" } },
    );
    const json = (await response.json()) as unknown;
    const list = extractItemList(json);
    if (list?.[0]) rememberProduct(list[0]);
    else {
      post({
        type: "PRODUCT_MISSING",
        item: {
          itemId,
          shopId,
          url: productUrl(location.origin, shopId, itemId),
        },
      });
    }
  } catch {
    post({ type: "PRODUCT_MISSING", item: { itemId, shopId, url: productUrl(location.origin, shopId, itemId) } });
  }
}

function stockFrom(json: unknown): { stock: number | null; images: string[] } {
  const list = extractItemList(json);
  const parsed = parseScoutEntry(list?.[0] ?? json, location.origin);
  return { stock: parsed?.stock ?? null, images: parsed?.images ?? [] };
}

async function fetchStock(shopId: string, itemId: string) {
  try {
    const response = await originalFetch(
      `${location.origin}/api/v4/item/get?itemid=${encodeURIComponent(itemId)}&shopid=${encodeURIComponent(shopId)}`,
      { credentials: "include", headers: { Accept: "application/json" } },
    );
    if (response.status === 403 || response.status === 429) {
      post({ type: "STOCK", itemId, stopped: true });
      return;
    }
    const json = (await response.json()) as unknown;
    const detail = stockFrom(json);
    post({ type: "STOCK", itemId, stock: detail.stock, images: detail.images, stopped: false });
  } catch {
    post({ type: "STOCK", itemId, stopped: true });
  }
}

async function fetchReviews(shopId: string, itemId: string) {
  const reviews: unknown[] = [];
  try {
    let offset = 0;
    while (reviews.length < 200) {
      const response = await originalFetch(
        `${location.origin}/api/v2/item/get_ratings?shopid=${encodeURIComponent(shopId)}&itemid=${encodeURIComponent(itemId)}&limit=20&offset=${offset}&type=0&filter=0`,
        { credentials: "include", headers: { Accept: "application/json" } },
      );
      if (!response.ok) {
        post({ type: "REVIEWS", itemId, reviews, error: `Shopee menghentikan ulasan (${response.status}).` });
        return;
      }
      const json = (await response.json()) as { error?: number; data?: { ratings?: unknown[] } };
      if (json.error) {
        post({ type: "REVIEWS", itemId, reviews, error: "Shopee menghentikan ulasan." });
        return;
      }
      const page = json.data?.ratings ?? [];
      if (!page.length) break;
      reviews.push(...page);
      offset += 20;
      if (page.length < 20) break;
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    post({ type: "REVIEWS", itemId, reviews });
  } catch {
    post({ type: "REVIEWS", itemId, reviews, error: "Ulasan tidak terbaca." });
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; channel?: string; type?: string; shopId?: string; itemId?: string };
  if (!data || data.source !== SOURCE || data.channel !== "page-request") return;
  if (data.type === "PING") {
    if (product) post({ type: "PRODUCT", item: product });
    if (scoutPage) publishScout();
  }
  if (data.type === "FETCH_ITEM" && data.shopId && data.itemId) void fetchItem(data.shopId, data.itemId);
  if (data.type === "FETCH_STOCK" && data.shopId && data.itemId) void fetchStock(data.shopId, data.itemId);
  if (data.type === "FETCH_REVIEWS" && data.shopId && data.itemId) void fetchReviews(data.shopId, data.itemId);
});
