import { SOURCE } from "../shared/types";

export type BridgeResult = { ok: boolean; httpStatus?: number; data?: unknown; error?: string };

export class AffiliateClient {
  private iframe: HTMLIFrameElement | null = null;
  private ready: Promise<void> | null = null;
  private pending = new Map<string, (result: BridgeResult) => void>();

  constructor(private readonly origin: string) {
    window.addEventListener("message", (event) => {
      if (event.origin !== origin) return;
      const data = event.data as { source?: string; channel?: string; type?: string; requestId?: string };
      if (!data || data.source !== SOURCE || data.channel !== "bridge" || !data.requestId) return;
      const resolve = this.pending.get(data.requestId);
      if (!resolve) return;
      this.pending.delete(data.requestId);
      const payload = event.data as BridgeResult;
      resolve({ ok: Boolean(payload.ok), httpStatus: payload.httpStatus, data: payload.data, error: payload.error });
    });
  }

  private ensure(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.ready = null;
        this.iframe?.remove();
        this.iframe = null;
        reject(new Error("Affiliate bridge timeout"));
      }, 8000);
      const onReady = (event: MessageEvent) => {
        if (event.origin !== this.origin) return;
        const data = event.data as { source?: string; type?: string };
        if (data?.source === SOURCE && data.type === "BRIDGE_READY") {
          window.clearTimeout(timer);
          window.removeEventListener("message", onReady);
          resolve();
        }
      };
      window.addEventListener("message", onReady);
      const iframe = document.createElement("iframe");
      iframe.src = `${this.origin}/?ea=1`;
      iframe.title = "Elevate Affiliate bridge";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0";
      (document.body ?? document.documentElement).appendChild(iframe);
      this.iframe = iframe;
    });
    return this.ready;
  }

  private async call(type: string, payload: Record<string, string>): Promise<BridgeResult> {
    try {
      await this.ensure();
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "bridge unavailable" };
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ ok: false, error: "timeout" });
      }, 8000);
      this.pending.set(requestId, (result) => {
        window.clearTimeout(timer);
        resolve(result);
      });
      this.iframe?.contentWindow?.postMessage(
        { source: SOURCE, channel: "bridge-request", type, requestId, ...payload },
        this.origin,
      );
    });
  }

  fetchCommission(itemId: string) {
    return this.call("FETCH_COMMISSION", { itemId });
  }

  fetchList(shopId: string) {
    return this.call("FETCH_COMMISSION_LIST", { shopId });
  }

  fetchOfferLink(itemId: string, shopId: string) {
    return this.call("FETCH_OFFER_LINK", { itemId, shopId });
  }
}
