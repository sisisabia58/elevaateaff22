import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { buildCaptions } from "../shared/captions";
import { commissionView, extractOfferLink, parseCommissionList, parseCommissionPayload } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { zipImages } from "../shared/images";
import { formatMoney, formatRate, marketFromHost } from "../shared/money";
import { priceHistogram, shopSummary } from "../shared/research";
import { callAiProxy, callFeatureProxy, pingFeature, reportShopeeAccount } from "../shared/server";
import { loadSettings } from "../shared/settings";
import { downloadDataUrl, drawShareCard } from "../shared/share";
import { affiliateOriginFor, classifyLocation, parseShopeeIds } from "../shared/shopee";
import { SOURCE, type CommissionView, type LiveCommission, type ScoutItem, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { ProductCard } from "../ui/ProductCard";
import { RankingList } from "../ui/RankingList";
import { ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
import { AffiliateClient } from "./affiliate-client";

type PageMessage = {
  source?: string;
  channel?: string;
  type?: string;
  item?: ScoutItem;
  items?: ScoutItem[];
  label?: string;
  itemId?: string;
  stock?: number | null;
  images?: string[];
  stopped?: boolean;
  reviews?: unknown[];
  error?: string;
  shopeeUserId?: string;
  username?: string | null;
  shopId?: string | null;
  isSeller?: boolean;
};

const dockMounts = new WeakMap<HTMLElement, HTMLElement>();

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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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
  const [adsOnly, setAdsOnly] = useState(false);
  const [checkLabel, setCheckLabel] = useState("Cek komisi asli");
  const [linkLabel, setLinkLabel] = useState("Salin link affiliate");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [taskNote, setTaskNote] = useState<string | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [dockMount, setDockMount] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<{ title: string; body: string } | null>(null);
  const [ranking, setRanking] = useState<unknown>(null);
  const liveRef = useRef(live);
  const productRef = useRef(product);
  const itemsRef = useRef(items);
  const hrefRef = useRef(href);
  const stopRef = useRef(false);
  const waiters = useRef(new Set<(data: PageMessage) => void>());
  const reported = useRef(new Set<string>());
  liveRef.current = live;
  productRef.current = product;
  itemsRef.current = items;
  hrefRef.current = href;

  const market = marketFromHost(location.hostname);
  const kind = classifyLocation(href);
  const clientRef = useRef<AffiliateClient | null>(null);
  if (!clientRef.current) clientRef.current = new AffiliateClient(affiliateOriginFor(location.hostname));

  function waitPage(type: string, itemId: string, ms: number) {
    return new Promise<PageMessage | null>((resolve) => {
      const timer = window.setTimeout(() => {
        waiters.current.delete(onData);
        resolve(null);
      }, ms);
      const onData = (data: PageMessage) => {
        if (data.type !== type || data.itemId !== itemId) return;
        window.clearTimeout(timer);
        waiters.current.delete(onData);
        resolve(data);
      };
      waiters.current.add(onData);
    });
  }

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
      waiters.current.forEach((waiter) => waiter(data));
      if (data.type === "PRODUCT" && data.item) {
        setProduct(data.item);
        setProductPhase("ready");
      }
      if (data.type === "PRODUCT_MISSING") setProductPhase("error");
      if (data.type === "SCOUT" && data.items) {
        setItems(data.items);
        if (data.label) setScoutLabel(data.label);
      }
      if (data.type === "ACCOUNT" && data.shopeeUserId && !reported.current.has(data.shopeeUserId)) {
        reported.current.add(data.shopeeUserId);
        void reportShopeeAccount({
          shopeeUserId: data.shopeeUserId,
          username: data.username ?? null,
          shopId: data.shopId ?? null,
          isSeller: Boolean(data.isSeller),
        });
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
        setTaskNote(undefined);
        setRanking(null);
        setPanel(null);
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
    if (kind !== "search" && kind !== "shop") {
      document.getElementById("ea-scout-dock")?.remove();
      setDockMount(null);
      return;
    }
    let cancelled = false;
    const place = () => {
      const anchor = document.querySelector(
        ".shopee-search-item-result__items, .shop-search-result-view, .shop-page__all-products-section, .shopee-search-item-result",
      );
      if (!anchor?.parentElement || cancelled) return;
      let host = document.getElementById("ea-scout-dock");
      if (!host) {
        host = document.createElement("div");
        host.id = "ea-scout-dock";
        const shadow = host.attachShadow({ mode: "open" });
        const mount = document.createElement("div");
        shadow.appendChild(mount);
        dockMounts.set(host, mount);
      }
      if (host.parentElement !== anchor.parentElement || host.nextElementSibling !== anchor) {
        anchor.parentElement.insertBefore(host, anchor);
      }
      const mount = dockMounts.get(host) ?? null;
      if (mount) setDockMount(mount);
    };
    place();
    const timer = window.setInterval(place, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [kind, href]);

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
      if (message?.type === "EA_GET_STATE") {
        const current = productRef.current;
        sendResponse({
          kind: classifyLocation(location.href),
          label: current?.name || scoutLabel,
          item: current,
          scoutCount: itemsRef.current.length,
          live: current ? liveRef.current[current.itemId] ?? null : null,
        });
        return true;
      }
      if (message?.type === "EA_FETCH_REVIEWS") {
        const current = productRef.current;
        if (!current) {
          sendResponse({ ok: false, error: "Produk belum terbaca." });
          return true;
        }
        askPage({ type: "FETCH_REVIEWS", shopId: current.shopId, itemId: current.itemId });
        void waitPage("REVIEWS", current.itemId, 20000).then((page) => {
          if (!page) sendResponse({ ok: false, error: "Ulasan tidak masuk." });
          else if (page.error && !(page.reviews || []).length) sendResponse({ ok: false, error: page.error });
          else sendResponse({ ok: true, reviews: page.reviews ?? [], error: page.error });
        });
        return true;
      }
      return false;
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

  function applyStock(message: PageMessage) {
    if (!message.itemId) return;
    const patch = (item: ScoutItem): ScoutItem =>
      item.itemId === message.itemId
        ? {
            ...item,
            stock: message.stock ?? item.stock,
            images: message.images?.length ? message.images : item.images,
          }
        : item;
    setItems((current) => current.map(patch));
    setProduct((current) => (current ? patch(current) : current));
  }

  async function checkLive() {
    const client = clientRef.current;
    if (!client || running) return;
    const affiliate = client;
    stopRef.current = false;
    setRunning(true);
    setCheckLabel("Membuka sesi affiliate…");
    void pingFeature("commission_check");
    if (kind === "shop" && itemsRef.current[0]) {
      const result = await client.fetchList(itemsRef.current[0].shopId);
      const found = parseCommissionList(result.data);
      if (!result.ok || found.size === 0) {
        setCheckLabel("Sesi affiliate belum kebaca");
        setRunning(false);
        return;
      }
      setLive((current) => {
        const next = { ...current };
        for (const item of itemsRef.current) {
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
      setRunning(false);
      return;
    }
    const batch = itemsRef.current;
    if (batch.length === 0) {
      setCheckLabel("Belum ada produk");
      setRunning(false);
      return;
    }
    let hits = 0;
    let cursor = 0;
    async function worker() {
      while (!stopRef.current) {
        const index = cursor;
        cursor += 1;
        if (index >= batch.length) return;
        const item = batch[index];
        setCheckLabel(`Cek komisi ${index + 1}/${batch.length}`);
        const result = await affiliate.fetchCommission(item.itemId);
        const parsed = parseCommissionPayload(result.data, item.price);
        if (parsed) {
          hits += 1;
          setLive((current) => ({ ...current, [item.itemId]: parsed }));
        }
        if (index < batch.length - 1) await delay(700);
      }
    }
    await Promise.all([worker(), worker()]);
    setCheckLabel(stopRef.current ? `Dihentikan · ${hits} produk` : hits > 0 ? `Komisi asli · ${hits} produk` : "Sesi affiliate belum kebaca");
    setRunning(false);
  }

  async function deepen() {
    if (running) return;
    const batch = itemsRef.current;
    if (!batch.length) {
      setTaskNote("Belum ada produk untuk diperdalam.");
      return;
    }
    stopRef.current = false;
    setRunning(true);
    let cursor = 0;
    let blocked = false;
    async function worker() {
      while (!stopRef.current && !blocked) {
        const index = cursor;
        cursor += 1;
        if (index >= batch.length) return;
        const item = batch[index];
        setTaskNote(`Stok ${index + 1}/${batch.length}`);
        askPage({ type: "FETCH_STOCK", shopId: item.shopId, itemId: item.itemId });
        const message = await waitPage("STOCK", item.itemId, 8000);
        if (!message || message.stopped) {
          blocked = true;
          return;
        }
        applyStock(message);
        await delay(900);
      }
    }
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setTaskNote(blocked ? "Shopee menghentikan pendalaman." : stopRef.current ? "Dihentikan." : "Stok selesai dibaca.");
  }

  async function paginate() {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    let page = 0;
    let note = "Halaman berikut selesai.";
    while (page < 20 && !stopRef.current) {
      const before = location.href;
      const beforeCount = itemsRef.current.length;
      const button = document.querySelector<HTMLElement>(
        'button[aria-label*="next" i], button[aria-label*="berikut" i], .shopee-icon-button--right',
      );
      if (!button) {
        note = "Tombol halaman berikut tidak ketemu.";
        break;
      }
      button.click();
      page += 1;
      setTaskNote(`Pindah halaman ${page}`);
      await delay(2500);
      if (stopRef.current) {
        note = "Dihentikan.";
        break;
      }
      if (location.href === before && itemsRef.current.length === beforeCount) {
        note = "Shopee menghentikan pindah halaman.";
        break;
      }
    }
    setRunning(false);
    setTaskNote(note);
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

  async function askAi(title: string, feature: string, payload: Record<string, unknown>) {
    if (!settings) return;
    setPanel({ title, body: "Menghubungi Gemini…" });
    void pingFeature(feature);
    const result = await callAiProxy(feature, payload, settings.geminiApiKey, settings.geminiModel);
    setPanel({ title, body: result.ok ? result.text : result.error });
  }

  async function rankHere() {
    if (!product) return;
    setPanel({ title: "Peringkat varian", body: "Membaca ulasan…" });
    setRanking(null);
    void pingFeature("variant_ranking");
    askPage({ type: "FETCH_REVIEWS", shopId: product.shopId, itemId: product.itemId });
    const message = await waitPage("REVIEWS", product.itemId, 20000);
    if (!message || (message.error && !(message.reviews || []).length)) {
      setPanel({ title: "Peringkat varian", body: message?.error || "Ulasan tidak masuk." });
      return;
    }
    const result = await callFeatureProxy("variant_ranking", { reviews: message.reviews ?? [] });
    if (!result.ok) {
      setPanel({ title: "Peringkat varian", body: result.error });
      return;
    }
    setRanking(result.data);
    setPanel(message.error ? { title: "Peringkat varian", body: message.error } : null);
  }

  if (!settings) return null;
  const showCard = kind === "product" && !cardClosed;
  const showScout = settings.showScout && (kind === "search" || kind === "shop") && !scoutClosed;
  const captions = product ? buildCaptions(product, market, settings.tone) : [];
  const visibleItems = adsOnly ? items.filter((item) => item.isAd) : items;
  const summary = kind === "shop" ? shopSummary(items) : null;
  const histogram = priceHistogram(items);

  const scout = (
    <ScoutPanel
      title={`${kind === "shop" ? "Toko" : "Pencarian"} · ${scoutLabel} · ${items.length} produk`}
      items={items}
      market={market}
      commissions={commissions}
      sort={sort}
      onSort={setSort}
      onOpen={(item) => window.open(item.url, "_blank", "noopener")}
      onCheckLive={() => void checkLive()}
      onExport={() => downloadText("elevate-affiliate.csv", scoutCsv(visibleItems, commissions))}
      checkLabel={checkLabel}
      onClose={() => setScoutClosed(true)}
      placement={dockMount ? "dock" : "float"}
      summary={summary}
      histogram={histogram}
      adsOnly={adsOnly}
      onAdsOnly={setAdsOnly}
      running={running}
      onStop={() => {
        stopRef.current = true;
      }}
      onDeepen={() => void deepen()}
      onPaginate={() => void paginate()}
      onShopNote={
        kind === "shop"
          ? () => {
              setTaskNote("Menghubungi Gemini…");
              void pingFeature("shop_research");
              void callAiProxy(
                "shop_research",
                { summary, names: items.slice(0, 12).map((item) => item.name) },
                settings.geminiApiKey,
                settings.geminiModel,
              ).then((result) => setTaskNote(result.ok ? result.text : result.error));
            }
          : undefined
      }
      taskNote={taskNote}
    />
  );

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
          onShare={() => {
            if (!product) return;
            const commission = commissions[product.itemId];
            const hrefCard = drawShareCard({
              name: product.name,
              price: formatMoney(product.price, market),
              commission: commission ? formatMoney(commission.amount, market) : "—",
              rate: commission ? formatRate(commission.ratePct) : "",
              shop: product.shopName,
            });
            if (hrefCard) downloadDataUrl(`elevate-${product.itemId}.png`, hrefCard);
          }}
          onZip={() => {
            if (!product) return;
            const urls = [...(product.images ?? []), product.image].filter((url): url is string => Boolean(url));
            void zipImages(urls, `elevate-${product.itemId}.zip`)
              .then((count) => setDetail(`${count} gambar disimpan.`))
              .catch((error: unknown) => setDetail(error instanceof Error ? error.message : "Zip gagal."));
          }}
          onSummarize={() => {
            if (!product) return;
            void askAi("Ringkas produk", "riset_produk", {
              name: product.name,
              price: product.price,
              sold: product.sold,
              shopName: product.shopName,
            });
          }}
          onThread={() => {
            if (!product) return;
            const commission = commissions[product.itemId];
            void askAi("5 angle", "affiliate_thread", {
              name: product.name,
              price: product.price,
              commission: commission?.amount,
              tone: settings.tone,
            });
          }}
          onRank={() => void rankHere()}
          panel={panel}
          ranking={ranking ? <RankingList data={ranking} /> : null}
        />
      )}
      {showScout && dockMount ? createPortal(scout, dockMount) : null}
      {showScout && !dockMount ? scout : null}
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
