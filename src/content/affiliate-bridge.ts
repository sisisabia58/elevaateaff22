import { SOURCE } from "../shared/types";

function allowedParent(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "shopee.co.id" || host === "shopee.com.my" || host.endsWith(".shopee.co.id") || host.endsWith(".shopee.com.my");
  } catch {
    return false;
  }
}

function reply(target: MessageEventSource | null, origin: string, payload: Record<string, unknown>) {
  if (!target || typeof (target as Window).postMessage !== "function") return;
  (target as Window).postMessage({ source: SOURCE, channel: "bridge", ...payload }, origin);
}

async function request(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      headers: { Accept: "application/json, text/plain, */*", ...(init?.headers ?? {}) },
      ...init,
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { ok: response.ok && data !== null, httpStatus: response.status, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }
}

const OFFER_QUERY = `
  query batchGetProductOfferLink(
    $sourceCaller: SourceCaller!
    $productOfferLinkParams: [ProductOfferLinkParam!]!
    $advancedLinkParams: AdvancedLinkParams
  ) {
    productOfferLinks(
      productOfferLinkParams: $productOfferLinkParams
      sourceCaller: $sourceCaller
      advancedLinkParams: $advancedLinkParams
    ) {
      itemId
      shopId
      productOfferLink
    }
  }
`;

window.addEventListener("message", (event) => {
  const data = event.data as {
    source?: string;
    channel?: string;
    type?: string;
    requestId?: string;
    itemId?: string;
    shopId?: string;
  };
  if (!data || data.source !== SOURCE || data.channel !== "bridge-request") return;
  if (event.source !== window.parent || !allowedParent(event.origin) || !data.requestId) return;

  const finish = (result: Record<string, unknown>, type: string) => {
    reply(event.source, event.origin, { type, requestId: data.requestId, ...result });
  };

  if (data.type === "FETCH_COMMISSION" && data.itemId) {
    void request(`${location.origin}/api/v3/offer/product?item_id=${encodeURIComponent(data.itemId)}`).then((result) =>
      finish(result, "FETCH_COMMISSION_RESULT"),
    );
    return;
  }
  if (data.type === "FETCH_COMMISSION_LIST" && data.shopId) {
    const url = `${location.origin}/api/v3/offer/product/list?match_id=${encodeURIComponent(data.shopId)}&list_type=5&match_type=1&page_offset=0&page_limit=50&sort_type=1&client_type=1`;
    void request(url).then((result) => finish(result, "FETCH_COMMISSION_LIST_RESULT"));
    return;
  }
  if (data.type === "FETCH_OFFER_LINK" && data.itemId && data.shopId) {
    const body = {
      operationName: "batchGetProductOfferLink",
      query: OFFER_QUERY,
      variables: {
        productOfferLinkParams: [{ itemId: String(data.itemId), shopId: Number(data.shopId) }],
        sourceCaller: "WEB_SITE_CALLER",
        advancedLinkParams: { subId1: "", subId2: "", subId3: "", subId4: "", subId5: "" },
      },
    };
    void request(`${location.origin}/api/v3/gql?q=productOfferLinks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((result) => finish(result, "FETCH_OFFER_LINK_RESULT"));
  }
});

if (window.parent !== window) {
  window.setTimeout(() => {
    window.parent.postMessage({ source: SOURCE, channel: "bridge", type: "BRIDGE_READY" }, "*");
  }, 600);
}
