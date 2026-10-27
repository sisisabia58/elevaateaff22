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

async function readJson(response: Response, rawUrl: string) {
  try {
    const json = await response.clone().json();
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
  if (listKindFromUrl(rawUrl) || isProductDetailUrl(rawUrl)) {
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
    if (!listKindFromUrl(rawUrl) && !isProductDetailUrl(rawUrl)) return;
    try {
      const json = JSON.parse(this.responseText) as unknown;
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

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; channel?: string; type?: string; shopId?: string; itemId?: string };
  if (!data || data.source !== SOURCE || data.channel !== "page-request") return;
  if (data.type === "PING") {
    if (product) post({ type: "PRODUCT", item: product });
    if (scoutPage) publishScout();
  }
  if (data.type === "FETCH_ITEM" && data.shopId && data.itemId) void fetchItem(data.shopId, data.itemId);
});
