import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildCaptions } from "../shared/captions";
import { commissionView, extractOfferLink, parseCommissionList, parseCommissionPayload } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { marketFromHost } from "../shared/money";
import { loadSettings } from "../shared/settings";
import { affiliateOriginFor, classifyLocation, parseShopeeIds } from "../shared/shopee";
import { SOURCE, type CommissionView, type LiveCommission, type ScoutItem, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { ProductCard } from "../ui/ProductCard";
import { ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
import { AffiliateClient } from "./affiliate-client";

type PageMessage = {
  source?: string;
  channel?: string;
  type?: string;
  item?: ScoutItem;
  items?: ScoutItem[];
  label?: string;
};

function askPage(payload: Record<string, unknown>) {
  window.postMessage({ source: SOURCE, channel: "page-request", ...payload }, location.origin);
}

function injectPageHook() {
  const root = document.documentElement;
  if (root.dataset.eaInjected === "1") return;
  root.dataset.eaInjected = "1";
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.async = false;
  script.onload = () => {
    script.remove();
    askPage({ type: "PING" });
  };
  (document.head || root).appendChild(script);
}

function Overlay() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [href, setHref] = useState(location.href);
  const [product, setProduct] = useState<ScoutItem | null>(null);
  const [productPhase, setProductPhase] = useState<"loading" | "ready" | "error">("loading");
  const [items, setItems] = useState<ScoutItem[]>([]);
  const [scoutLabel, setScoutLabel] = useState("Pencarian");
  const [live, setLive] = useState<Record<string, LiveCommission>>({});
  const [cardClosed, setCardClosed] = useState(false);
  const [scoutClosed, setScoutClosed] = useState(false);
  const [sort, setSort] = useState<ScoutSort>("commission");
  const [checkLabel, setCheckLabel] = useState("Cek komisi asli");
  const [linkLabel, setLinkLabel] = useState("Salin link affiliate");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const liveRef = useRef(live);
  const productRef = useRef(product);
  const itemsRef = useRef(items);
  const hrefRef = useRef(href);
  liveRef.current = live;
  productRef.current = product;
  itemsRef.current = items;
  hrefRef.current = href;

  const market = marketFromHost(location.hostname);
  const kind = classifyLocation(href);
  const clientRef = useRef<AffiliateClient | null>(null);
  if (!clientRef.current) clientRef.current = new AffiliateClient(affiliateOriginFor(location.hostname));

  useEffect(() => {
    void loadSettings().then(setSettings);
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local" && changes["ea-settings"]) setSettings(changes["ea-settings"].newValue as Settings);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    injectPageHook();
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      const data = event.data as PageMessage;
      if (!data || data.source !== SOURCE || data.channel !== "page") return;
      if (data.type === "PRODUCT" && data.item) {
        setProduct(data.item);
        setProductPhase("ready");
      }
      if (data.type === "PRODUCT_MISSING") setProductPhase("error");
      if (data.type === "SCOUT" && data.items) {
        setItems(data.items);
        if (data.label) setScoutLabel(data.label);
      }
    };
    window.addEventListener("message", onMessage);
    const watch = window.setInterval(() => {
      if (location.href !== hrefRef.current) {
        setHref(location.href);
        setCardClosed(false);
        setScoutClosed(false);
        setProduct(null);
        setItems([]);
        setProductPhase(classifyLocation(location.href) === "product" ? "loading" : "ready");
        setDetail(undefined);
        setLinkLabel("Salin link affiliate");
        askPage({ type: "PING" });
      }
    }, 800);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(watch);
    };
  }, []);

  useEffect(() => {
    if (kind !== "product") return;
    const ids = parseShopeeIds(href);
    if (!ids) return;
    const timer = window.setTimeout(() => {
      if (!productRef.current) askPage({ type: "FETCH_ITEM", ...ids });
    }, 1200);
    const fail = window.setTimeout(() => {
      if (!productRef.current) setProductPhase("error");
    }, 6000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(fail);
    };
  }, [href, kind]);

  useEffect(() => {
    const listener = (
      message: { type?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ) => {
      if (message?.type !== "EA_GET_STATE") return false;
      const current = productRef.current;
      sendResponse({
        kind: classifyLocation(location.href),
        label: current?.name || scoutLabel,
        item: current,
        scoutCount: itemsRef.current.length,
        live: current ? liveRef.current[current.itemId] ?? null : null,
      });
      return true;
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [scoutLabel]);

  const commissions = useMemo(() => {
    const map: Record<string, CommissionView> = {};
    if (!settings) return map;
    for (const item of items) map[item.itemId] = commissionView(item, settings, live[item.itemId] ?? null);
    if (product) map[product.itemId] = commissionView(product, settings, live[product.itemId] ?? null);
    return map;
  }, [items, live, product, settings]);

  async function checkLive() {
    const client = clientRef.current;
    if (!client || checkLabel.startsWith("Membuka") || /^Cek komisi \d/.test(checkLabel)) return;
    setCheckLabel("Membuka sesi affiliate…");
    if (kind === "shop" && items[0]) {
      const result = await client.fetchList(items[0].shopId);
      const found = parseCommissionList(result.data);
      if (!result.ok || found.size === 0) {
        setCheckLabel("Sesi affiliate belum kebaca");
        return;
      }
      setLive((current) => {
        const next = { ...current };
        for (const item of items) {
          const row = found.get(item.itemId);
          if (!row) continue;
          next[item.itemId] = {
            ratePct: row.ratePct,
            amount: (item.price * row.ratePct) / 100,
            xtraRatePct: null,
            promotedLast7d: null,
            freeSample: row.freeSample,
          };
        }
        return next;
      });
      setCheckLabel(`Komisi asli · ${found.size} produk`);
      return;
    }
    const batch = items.slice(0, 8);
    if (batch.length === 0) {
      setCheckLabel("Belum ada produk");
      return;
    }
    let hits = 0;
    for (let index = 0; index < batch.length; index += 1) {
      const item = batch[index];
      setCheckLabel(`Cek komisi ${index + 1}/${batch.length}`);
      const result = await client.fetchCommission(item.itemId);
      const parsed = parseCommissionPayload(result.data, item.price);
      if (parsed) {
        hits += 1;
        setLive((current) => ({ ...current, [item.itemId]: parsed }));
      }
      if (index < batch.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 700));
    }
    setCheckLabel(hits > 0 ? `Komisi asli · ${hits} produk` : "Sesi affiliate belum kebaca");
  }

  async function copyAffiliateLink() {
    if (!product || !clientRef.current) return;
    setLinkLabel("Mengambil link…");
    setDetail(undefined);
    const result = await clientRef.current.fetchOfferLink(product.itemId, product.shopId);
    const offer = result.ok ? extractOfferLink(result.data) : null;
    const copied = await copyText(offer ?? product.url);
    setLinkLabel("Salin link affiliate");
    if (!copied) {
      setDetail("Clipboard ditolak browser. Salin manual dari halaman produk.");
      return;
    }
    setDetail(offer ? "Link penawaran affiliate disalin." : "Sesi Affiliate belum aktif. Yang disalin adalah link produk biasa.");
  }

  if (!settings) return null;
  const showCard = kind === "product" && !cardClosed;
  const showScout = settings.showScout && (kind === "search" || kind === "shop") && !scoutClosed;
  const captions = product ? buildCaptions(product, market, settings.tone) : [];

  return (
    <>
      {showCard && (
        <ProductCard
          item={product}
          market={market}
          commission={product ? commissions[product.itemId] : null}
          captions={captions}
          phase={productPhase}
          detail={detail}
          linkLabel={linkLabel}
          onCopyLink={() => void copyAffiliateLink()}
          onCopyCaption={(text) => void copyText(text)}
          onClose={() => setCardClosed(true)}
        />
      )}
      {showScout && (
        <ScoutPanel
          title={`${kind === "shop" ? "Toko" : "Pencarian"} · ${scoutLabel} · ${items.length} produk`}
          items={items}
          market={market}
          commissions={commissions}
          sort={sort}
          onSort={setSort}
          onOpen={(item) => window.open(item.url, "_blank", "noopener")}
          onCheckLive={() => void checkLive()}
          onExport={() => downloadText("elevate-affiliate.csv", scoutCsv(items, commissions))}
          checkLabel={checkLabel}
          onClose={() => setScoutClosed(true)}
        />
      )}
    </>
  );
}

const host = document.createElement("div");
host.id = "elevate-affiliate-host";
host.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
const shadow = host.attachShadow({ mode: "open" });
const mount = document.createElement("div");
shadow.appendChild(mount);
document.documentElement.appendChild(host);
createRoot(mount).render(<Overlay />);
