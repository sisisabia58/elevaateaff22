import { parseOrderIncome } from "../shared/order-profit";
import { parseCreators, parseIncome, parsePerformance } from "../shared/research";
import { SOURCE } from "../shared/types";

const channel = "seller";
let bulkPerf = false;
let stopPerf = false;

function post(payload: Record<string, unknown>) {
  window.postMessage({ source: SOURCE, channel, ...payload }, location.origin);
}

function interesting(url: string) {
  return /income_detail|affiliateplatform\/creator|performance|mini\/login|account\/basic|get_account_info/i.test(url);
}

function handle(url: string, json: unknown) {
  const raw = String(url);
  if (raw.includes("/api/v4/accounting/pc/seller_income/income_detail/get_order_income_components")) {
    const income = parseIncome(json);
    const order = parseOrderIncome(json);
    post({ type: "INCOME", income, order, missing: !income && !order });
  }
  if (raw.includes("/api/v3/affiliateplatform/creator/list") || raw.includes("/api/v3/affiliateplatform/creator/detail")) {
    post({ type: "CREATORS", rows: parseCreators(json) });
  }
  if (!bulkPerf && raw.includes("/api/mydata/") && raw.includes("performance")) {
    const rows = parsePerformance(json);
    post({ type: "PERFORMANCE", rows, missing: rows.length === 0 });
  }
  if (/mini\/login|account\/basic|get_account_info/i.test(raw)) {
    const root = json !== null && typeof json === "object" ? (json as Record<string, unknown>) : null;
    const data = root && typeof root.data === "object" && root.data ? (root.data as Record<string, unknown>) : root;
    const id = data?.user_id ?? data?.userid;
    if (id != null) {
      post({
        type: "ACCOUNT",
        shopeeUserId: String(id),
        username: typeof data?.username === "string" ? data.username : null,
        shopId: data?.shopid != null ? String(data.shopid) : null,
        isSeller: true,
      });
    }
  }
}

async function fetchPerformanceCatalog() {
  stopPerf = false;
  bulkPerf = true;
  const items: unknown[] = [];
  let total: number | null = null;
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    for (let pageNum = 1; pageNum <= 200; pageNum += 1) {
      if (stopPerf) break;
      const params = new URLSearchParams({
        start_time: String(nowSec - 2_592_000),
        end_time: String(nowSec),
        period: "past30days",
        keyword: "",
        category_type: "shopee",
        category_id: "-1",
        page_size: "10",
        page_num: String(pageNum),
        order_type: "confirmed",
        order_by: "confirmed_sales.desc",
      });
      const pageParams = new URLSearchParams(location.search);
      const cds = pageParams.get("SPC_CDS");
      const cdsVer = pageParams.get("SPC_CDS_VER");
      if (cds) params.set("SPC_CDS", cds);
      if (cdsVer) params.set("SPC_CDS_VER", cdsVer);
      const response = await fetch(`https://seller.shopee.co.id/api/mydata/v4/product/performance/?${params}`, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json, text/plain, */*" },
      });
      if (!response.ok) throw new Error(`Shopee menolak performa (${response.status}).`);
      const json = (await response.json()) as { code?: number; msg?: string; result?: { total?: number; items?: unknown[] } };
      if (json.code) throw new Error(json.msg || `API performa ${json.code}`);
      if (total === null) total = json.result?.total || 0;
      const pageItems = json.result?.items || [];
      items.push(...pageItems);
      post({ type: "PERFORMANCE_PROGRESS", loaded: items.length, total: total || items.length });
      if (!pageItems.length || items.length >= (total || 0)) break;
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    const rows = parsePerformance({ items });
    post({ type: "PERFORMANCE", rows, done: true, missing: rows.length === 0 });
  } catch (error) {
    post({ type: "PERFORMANCE_ERROR", error: error instanceof Error ? error.message : "Performa tidak terbaca." });
  } finally {
    bulkPerf = false;
    stopPerf = false;
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data as { source?: string; channel?: string; type?: string };
  if (!data || data.source !== SOURCE || data.channel !== "seller-request") return;
  if (data.type === "FETCH_PERFORMANCE") void fetchPerformanceCatalog();
  if (data.type === "STOP_PERFORMANCE") stopPerf = true;
});

const originalFetch = window.fetch.bind(window);
window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const promise = originalFetch(input, init);
  if (interesting(rawUrl)) {
    promise
      .then((response) => {
        void response
          .clone()
          .json()
          .then((json) => handle(rawUrl, json))
          .catch(() => undefined);
      })
      .catch(() => undefined);
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
    if (!interesting(rawUrl)) return;
    try {
      handle(rawUrl, JSON.parse(this.responseText) as unknown);
    } catch {
      /* ignore */
    }
  });
  return originalSend.call(this, body);
};
