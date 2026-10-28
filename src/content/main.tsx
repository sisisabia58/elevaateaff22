import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { shopRelation } from "../shared/analytics";
import { aiItemInfo, buildCaptions, buttonLabels, isOwnShop, parseThreadParts, reviewFeature, type AiPanel, type ThreadAngle } from "../shared/captions";
import { commissionView, extractOfferLink, parseCommissionList, parseCommissionPayload } from "../shared/commission";
import { downloadText, scoutCsv } from "../shared/csv";
import { zipImages } from "../shared/images";
import { formatMoney, formatRate, marketFromHost } from "../shared/money";
import { marketDataBlock, shopDataBlock, type MarketAiScope } from "../shared/market-brief";
import { priceHistogram, shopSummary } from "../shared/research";
import { callAiProxy, callFeatureProxy, pingFeature, reportShopeeAccount } from "../shared/server";
import { loadSettings } from "../shared/settings";
import { downloadDataUrl, drawShareCard } from "../shared/share";
import { affiliateOriginFor, classifyLocation, marketChrome, parseShopeeIds } from "../shared/shopee";
import { SOURCE, type CommissionView, type LiveCommission, type ScoutItem, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { PageActions } from "../ui/PageActions";
import { ProductCard } from "../ui/ProductCard";
import { RankingList } from "../ui/RankingList";
import { MarketAiDialog, type MarketAiPhase } from "../ui/MarketAiDialog";
import { MarketPill, ScoutPanel, type ScoutSort } from "../ui/ScoutPanel";
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
  ctime?: number | null;
  done?: boolean;
  shopeeUserId?: string;
  username?: string | null;
  shopId?: string | null;
  isSeller?: boolean;
};

const dockMounts = new WeakMap<HTMLElement, HTMLElement>();
const actionMounts = new WeakMap<HTMLElement, HTMLElement>();
const COMMISSION_CACHE_KEY = "ea-commission-cache";
const COMMISSION_CACHE_MS = 86_400_000;

function buyButton(): HTMLElement | null {
  for (const button of document.querySelectorAll("button")) {
    const text = (button.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length > 32) continue;
    if (/^(beli|buy now)\b/i.test(text)) return button;
  }
  return null;
}

function cartButton(): HTMLElement | null {
  for (const button of document.querySelectorAll("button")) {
    const text = (button.textContent || "").replace(/\s+/g, " ").trim();
    if (/^(masukkan keranjang|add to cart|tambah dalam troli)$/i.test(text)) return button;
  }
  return null;
}

function quantityRow(): HTMLElement | null {
  for (const node of document.querySelectorAll("div, span, label, p, strong")) {
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    if (text.length > 16) continue;
    if (/^(kuantitas|quantity|kuantiti)\s*:?$/i.test(text)) return node.parentElement;
  }
  return null;
}

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
  const [floatOpen, setFloatOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSubtitle, setAiSubtitle] = useState("-");
  const [aiPhase, setAiPhase] = useState<MarketAiPhase>("loading");
  const [aiText, setAiText] = useState("");
  const aiRun = useRef<() => void>(() => undefined);
  const [sort, setSort] = useState<ScoutSort>("commission");
  const [adsOnly, setAdsOnly] = useState(false);
  const [checkLabel, setCheckLabel] = useState("Cek komisi asli");
  const [linkLabel, setLinkLabel] = useState("Salin link affiliate");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [taskNote, setTaskNote] = useState<string | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [dockMount, setDockMount] = useState<HTMLElement | null>(null);
  const [actionMount, setActionMount] = useState<HTMLElement | null>(null);
  const [panel, setPanel] = useState<AiPanel | null>(null);
  const [ranking, setRanking] = useState<unknown>(null);
  const [reviewRows, setReviewRows] = useState<unknown[]>([]);
  const [shopCtimes, setShopCtimes] = useState<Record<string, number>>({});
  const liveRef = useRef(live);
  const productRef = useRef(product);
  const itemsRef = useRef(items);
  const hrefRef = useRef(href);
  const stopRef = useRef(false);
  const shopCtimesRef = useRef(shopCtimes);
  const soldOutRef = useRef(new Map<string, ScoutItem>());
  const waiters = useRef(new Set<(data: PageMessage) => void>());
  const reported = useRef(new Set<string>());
  liveRef.current = live;
  productRef.current = product;
  itemsRef.current = items;
  hrefRef.current = href;
  shopCtimesRef.current = shopCtimes;

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
        const incoming = data.items;
        const seen = new Set(incoming.map((item) => item.itemId));
        const extras = [...soldOutRef.current.values()].filter((item) => !seen.has(item.itemId));
        setItems([
          ...incoming.map((item) => (soldOutRef.current.has(item.itemId) ? { ...item, soldOut: true } : item)),
          ...extras,
        ]);
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
        setFloatOpen(false);
        setProduct(null);
        soldOutRef.current.clear();
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
    if (kind !== "search" && kind !== "category" && kind !== "shop") {
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
    if (kind !== "product") {
      document.getElementById("ea-page-actions")?.remove();
      setActionMount(null);
      return;
    }
    let cancelled = false;
    const place = () => {
      const anchor = buyButton() || cartButton() || quantityRow();
      if (!anchor?.parentElement || cancelled) return;
      let host = document.getElementById("ea-page-actions");
      if (!host) {
        host = document.createElement("div");
        host.id = "ea-page-actions";
        host.style.cssText = "display:inline-block;vertical-align:middle;";
        const shadow = host.attachShadow({ mode: "open" });
        const mount = document.createElement("div");
        shadow.appendChild(mount);
        actionMounts.set(host, mount);
      }
      if (host.previousElementSibling !== anchor) anchor.parentElement.insertBefore(host, anchor.nextSibling);
      const mount = actionMounts.get(host) ?? null;
      if (mount) setActionMount(mount);
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
        void waitPage("REVIEWS", current.itemId, 90000).then((page) => {
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
    const detail = message.item;
    const patch = (item: ScoutItem): ScoutItem => {
      if (item.itemId !== message.itemId) return item;
      if (!detail) {
        return {
          ...item,
          stock: message.stock ?? item.stock,
          images: message.images?.length ? message.images : item.images,
        };
      }
      return {
        ...item,
        stock: detail.stock ?? message.stock ?? item.stock,
        images: detail.images?.length ? detail.images : item.images,
        sold: detail.sold ?? item.sold,
        monthlySold: detail.monthlySold ?? item.monthlySold,
        monthlySoldText: detail.monthlySoldText ?? item.monthlySoldText,
        ctime: detail.ctime ?? item.ctime,
        wishlist: detail.wishlist ?? item.wishlist,
        ratingCount: detail.ratingCount ?? item.ratingCount,
        rating: detail.rating ?? item.rating,
        soldOut: detail.soldOut ?? item.soldOut,
        soldText: detail.soldText ?? item.soldText,
        models: detail.models?.length ? detail.models : item.models,
      };
    };
    setItems((current) => current.map(patch));
    setProduct((current) => (current ? patch(current) : current));
  }

  async function readCommissionCache() {
    const stored = await chrome.storage.local.get(COMMISSION_CACHE_KEY);
    const bag = stored[COMMISSION_CACHE_KEY];
    return bag && typeof bag === "object" ? (bag as Record<string, { at: number; live: LiveCommission }>) : {};
  }

  async function rememberCommission(itemId: string, row: LiveCommission) {
    const bag = await readCommissionCache();
    bag[itemId] = { at: Date.now(), live: row };
    await chrome.storage.local.set({ [COMMISSION_CACHE_KEY]: bag });
  }

  async function checkLive() {
    const client = clientRef.current;
    if (!client || running) return;
    const affiliate = client;
    stopRef.current = false;
    setRunning(true);
    setCheckLabel("Membuka sesi affiliate…");
    void pingFeature("commission_check");
    const cache = await readCommissionCache();
    const now = Date.now();
    const cached: Record<string, LiveCommission> = {};
    for (const item of itemsRef.current) {
      const hit = cache[item.itemId];
      if (hit && now - hit.at < COMMISSION_CACHE_MS) cached[item.itemId] = hit.live;
    }
    if (Object.keys(cached).length) setLive((current) => ({ ...cached, ...current }));
    const pending = itemsRef.current.filter((item) => !cached[item.itemId]);
    if (!pending.length && itemsRef.current.length) {
      setCheckLabel(`Komisi dari cache · ${itemsRef.current.length} produk`);
      setRunning(false);
      return;
    }
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
          const saved = {
            ratePct: row.ratePct,
            amount: (item.price * row.ratePct) / 100,
            xtraRatePct: null,
            promotedLast7d: row.promotedLast7d,
            freeSample: row.freeSample,
          };
          next[item.itemId] = saved;
          void rememberCommission(item.itemId, saved);
        }
        return next;
      });
      setCheckLabel(`Komisi asli · ${found.size} produk`);
      setRunning(false);
      return;
    }
    const batch = pending;
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
          void rememberCommission(item.itemId, parsed);
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
    let streak = 0;
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
          streak += 1;
          if (streak >= 3) blocked = true;
          continue;
        }
        streak = 0;
        applyStock(message);
        await delay(900);
      }
    }
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setTaskNote(blocked ? "Shopee menghentikan pendalaman." : stopRef.current ? "Dihentikan." : "Stok selesai dibaca.");
  }

  async function deepenOne(item: ScoutItem) {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setTaskNote(`Stok · ${item.name}`);
    askPage({ type: "FETCH_STOCK", shopId: item.shopId, itemId: item.itemId });
    const message = await waitPage("STOCK", item.itemId, 8000);
    if (!message || message.stopped) setTaskNote("Shopee menghentikan pendalaman.");
    else {
      applyStock(message);
      setTaskNote(message.item?.stock == null ? "Stok produk ini tidak terbaca." : `Stok ${message.item.stock.toLocaleString("id-ID")}.`);
    }
    setRunning(false);
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

  function readShopRelation(): "Toko sendiri" | "Toko kompetitor" {
    const nodes = document.querySelectorAll("button, a, span");
    let hasFollow = false;
    let hasChat = false;
    for (const node of nodes) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 16) continue;
      if (/^\+?\s*(ikuti|follow)$/i.test(text)) hasFollow = true;
      if (/^chat$/i.test(text)) hasChat = true;
      if (hasFollow && hasChat) break;
    }
    return shopRelation(hasFollow, hasChat);
  }

  function findShortControl(pattern: RegExp): HTMLElement | null {
    const nodes = document.querySelectorAll("button, a, [role='tab']");
    for (const node of nodes) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!text || text.length > 24) continue;
      if (pattern.test(text)) return node as HTMLElement;
    }
    return null;
  }

  async function fetchShopAges() {
    if (running) return;
    const ids = [...new Set(itemsRef.current.map((item) => item.shopId))].filter((id) => shopCtimesRef.current[id] == null);
    if (!ids.length) {
      setTaskNote(itemsRef.current.length ? "Umur toko sudah ada." : "Belum ada produk.");
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
        if (index >= ids.length) return;
        const shopId = ids[index];
        setTaskNote(`Umur toko ${index + 1}/${ids.length}`);
        askPage({ type: "FETCH_SHOP", shopId });
        const message = await waitPage("SHOP", shopId, 8000);
        if (message?.stopped) {
          blocked = true;
          return;
        }
        if (message?.ctime) {
          setShopCtimes((current) => ({ ...current, [shopId]: message.ctime as number }));
        }
        await delay(700);
      }
    }
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setTaskNote(blocked ? "Shopee menghentikan umur toko." : stopRef.current ? "Dihentikan." : "Umur toko selesai.");
  }

  async function checkAffiliates() {
    const client = clientRef.current;
    if (!client || running) return;
    const affiliate = client;
    stopRef.current = false;
    setRunning(true);
    void pingFeature("commission_check");
    let batch = itemsRef.current;
    if (kind === "shop" && batch[0]) {
      setTaskNote("Membaca daftar komisi toko…");
      const result = await affiliate.fetchList(batch[0].shopId);
      const found = parseCommissionList(result.data);
      if (result.ok && found.size > 0) {
        setLive((current) => {
          const next = { ...current };
          for (const item of itemsRef.current) {
            const row = found.get(item.itemId);
            if (!row) continue;
            const previous = next[item.itemId];
            next[item.itemId] = {
              ratePct: row.ratePct,
              amount: previous?.amount ?? (item.price * row.ratePct) / 100,
              xtraRatePct: previous?.xtraRatePct ?? null,
              promotedLast7d: row.promotedLast7d ?? previous?.promotedLast7d ?? null,
              freeSample: row.freeSample,
            };
          }
          return next;
        });
        batch = batch.filter((item) => found.get(item.itemId)?.promotedLast7d == null);
      }
    }
    if (!batch.length) {
      setRunning(false);
      setTaskNote("Jumlah affiliate terisi dari daftar toko.");
      return;
    }
    let cursor = 0;
    let hits = 0;
    async function worker() {
      while (!stopRef.current) {
        const index = cursor;
        cursor += 1;
        if (index >= batch.length) return;
        const item = batch[index];
        setTaskNote(`Affiliate ${index + 1}/${batch.length}`);
        const result = await affiliate.fetchCommission(item.itemId);
        const parsed = parseCommissionPayload(result.data, item.price);
        if (parsed) {
          hits += 1;
          setLive((current) => ({
            ...current,
            [item.itemId]: {
              ...parsed,
              promotedLast7d: parsed.promotedLast7d ?? current[item.itemId]?.promotedLast7d ?? null,
            },
          }));
        }
        if (index < batch.length - 1) await delay(700);
      }
    }
    await Promise.all([worker(), worker()]);
    setRunning(false);
    setTaskNote(stopRef.current ? "Dihentikan." : hits > 0 ? `Affiliate 7 hari · ${hits} produk` : "Sesi affiliate belum kebaca");
  }

  function mergeSoldOut(incoming: ScoutItem[]) {
    for (const item of incoming) soldOutRef.current.set(item.itemId, { ...item, soldOut: true });
    setItems((current) => {
      const byId = new Map(current.map((item) => [item.itemId, item]));
      for (const item of incoming) {
        const previous = byId.get(item.itemId);
        byId.set(item.itemId, previous ? { ...item, ...previous, soldOut: true } : { ...item, soldOut: true });
      }
      return [...byId.values()];
    });
  }

  function waitSoldOut(shopId: string, ms: number) {
    return new Promise<PageMessage | null>((resolve) => {
      const timer = window.setTimeout(() => {
        waiters.current.delete(onData);
        resolve(null);
      }, ms);
      const onData = (data: PageMessage) => {
        if (data.type !== "SOLDOUT" || data.itemId !== shopId || !data.done) return;
        window.clearTimeout(timer);
        waiters.current.delete(onData);
        resolve(data);
      };
      waiters.current.add(onData);
    });
  }

  async function loadSoldOut() {
    if (running) return;
    if (kind !== "shop") {
      setTaskNote("Produk habis hanya ada di halaman toko.");
      return;
    }
    const shopId = itemsRef.current[0]?.shopId;
    if (!shopId) {
      setTaskNote("Toko belum terbaca.");
      return;
    }
    stopRef.current = false;
    soldOutRef.current.clear();
    setRunning(true);
    setTaskNote("Membaca produk habis…");
    const onPage = (data: PageMessage) => {
      if (data.type !== "SOLDOUT" || data.itemId !== shopId || !data.items?.length) return;
      mergeSoldOut(data.items);
      setTaskNote(`Produk habis · ${soldOutRef.current.size}`);
    };
    waiters.current.add(onPage);
    const watch = window.setInterval(() => {
      if (stopRef.current) askPage({ type: "STOP_SOLDOUT" });
    }, 250);
    askPage({ type: "FETCH_SOLDOUT", shopId });
    const done = await waitSoldOut(shopId, 90000);
    window.clearInterval(watch);
    waiters.current.delete(onPage);
    const received = soldOutRef.current.size;
    if (stopRef.current) {
      setRunning(false);
      setTaskNote(received ? `Dihentikan · ${received} produk habis` : "Dihentikan.");
      return;
    }
    if (!received && done?.stopped) {
      const tab = findShortControl(/^(habis|sold out|stok habis)$/i);
      if (!tab) {
        setRunning(false);
        setTaskNote("Tab produk habis tidak ketemu.");
        return;
      }
      tab.click();
      setTaskNote("Shopee menghentikan produk habis. Membuka tab.");
      await delay(800);
      await paginate();
      return;
    }
    setRunning(false);
    setTaskNote(received ? `Produk habis · ${received}` : done ? "Tidak ada produk habis." : "Shopee menghentikan produk habis.");
  }

  function saveProductImages(current: ScoutItem) {
    const urls = [...(current.images ?? []), current.image].filter((url): url is string => Boolean(url));
    const groups = (current.models ?? []).map((model) => ({ name: model.name, urls: model.images }));
    void zipImages(urls, `elevate-${current.itemId}.zip`, groups)
      .then((count) => setDetail(`${count} gambar disimpan.`))
      .catch((error: unknown) => setDetail(error instanceof Error ? error.message : "Zip gagal."));
  }

  function openMarketAi(scope?: MarketAiScope) {
    const shop = kind === "shop";
    const list = scope?.items ?? itemsRef.current;
    const filterLabel = scope?.filterLabel ?? null;
    const own = shop && readShopRelation() === "Toko sendiri";
    const pageLine = kind === "category" ? `Kategori: ${scoutLabel}` : `Keyword: ${scoutLabel}`;
    const subtitle = shop
      ? `${own ? "Toko sendiri" : "Toko kompetitor"} — ${list[0]?.shopName || scoutLabel}`
      : `${pageLine}${filterLabel ? ` (difilter: ${filterLabel})` : ""}`;
    const run = () => {
      if (!settings) return;
      setAiOpen(true);
      setAiSubtitle(subtitle);
      if (!list.length) {
        setAiPhase("error");
        setAiText(shop ? 'Belum ada data produk buat dianalisa. Coba "Refresh data" dulu.' : 'Belum ada data produk buat dianalisa. Coba "Lihat lebih" dulu.');
        return;
      }
      if (!settings.geminiApiKey.trim()) {
        setAiPhase("nokey");
        setAiText("");
        return;
      }
      setAiPhase("loading");
      const feature = shop ? "shop_research" : "market_research";
      const payload = shop
        ? { dataBlock: shopDataBlock(list, own, market), isOwnShop: own }
        : {
            dataBlock: marketDataBlock(
              list,
              { pageType: kind === "category" ? "category" : "search", keyword: scoutLabel, categoryLabel: scoutLabel, filterLabel },
              market,
            ),
            filterLabel,
            pageType: kind === "category" ? "category" : "search",
          };
      void pingFeature(feature);
      void callAiProxy(feature, payload, settings.geminiApiKey, settings.geminiModel).then((result) => {
        setAiPhase(result.ok ? "result" : "error");
        setAiText(result.ok ? result.text : result.error);
      });
    };
    aiRun.current = run;
    run();
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

  async function loadReviews(item: ScoutItem) {
    askPage({ type: "FETCH_REVIEWS", shopId: item.shopId, itemId: item.itemId });
    const message = await waitPage("REVIEWS", item.itemId, 90000);
    if (!message) return { reviews: [] as unknown[], error: "Ulasan tidak masuk." };
    return { reviews: message.reviews ?? [], error: message.error };
  }

  async function askAi(title: string, feature: string, payload: Record<string, unknown>, owner: AiPanel["owner"] = null) {
    if (!settings) return;
    setPanel({ title, body: "Menghubungi Gemini…", owner });
    void pingFeature(feature);
    const result = await callAiProxy(feature, payload, settings.geminiApiKey, settings.geminiModel);
    setPanel({ title, body: result.ok ? result.text : result.error, owner, ai: result.ok });
  }

  async function analyseProduct() {
    if (!product || !settings) return;
    const labels = buttonLabels(document);
    const own = isOwnShop(labels);
    const owner = own ? "Toko Anda" : null;
    setCardClosed(false);
    setPanel({ title: "Analisa AI", body: "Membaca ulasan…", owner });
    const loaded = await loadReviews(product);
    if (loaded.error && !loaded.reviews.length) {
      setPanel({ title: "Analisa AI", body: loaded.error, owner });
      return;
    }
    await askAi(owner ? "Analisa toko sendiri" : "Analisa kompetitor", reviewFeature(labels), { itemInfo: aiItemInfo(product), reviews: loaded.reviews }, owner);
  }

  async function generateThread(angle: ThreadAngle) {
    if (!product || !settings) return;
    setCardClosed(false);
    setPanel({ title: "Thread Affiliate", body: "Membaca ulasan…" });
    const loaded = await loadReviews(product);
    if (loaded.error && !loaded.reviews.length) {
      setPanel({ title: "Thread Affiliate", body: loaded.error });
      return;
    }
    setPanel({ title: "Thread Affiliate", body: "Nulis thread..." });
    void pingFeature("affiliate_thread");
    const result = await callAiProxy(
      "affiliate_thread",
      { itemInfo: aiItemInfo(product), reviews: loaded.reviews, angleKey: angle },
      settings.geminiApiKey,
      settings.geminiModel,
    );
    if (!result.ok) {
      setPanel({ title: "Thread Affiliate", body: result.error });
      return;
    }
    const parts = parseThreadParts(result.text);
    if (!parts.length) {
      setPanel({ title: "Thread Affiliate", body: "AI gak ngembaliin thread yang valid. Coba generate ulang." });
      return;
    }
    setPanel({ title: "Thread Affiliate", body: "", parts, ai: true });
  }

  async function rankHere() {
    if (!product) return;
    setPanel({ title: "Peringkat varian", body: "Membaca ulasan…" });
    setRanking(null);
    void pingFeature("variant_ranking");
    askPage({ type: "FETCH_REVIEWS", shopId: product.shopId, itemId: product.itemId });
    const message = await waitPage("REVIEWS", product.itemId, 90000);
    if (!message || (message.error && !(message.reviews || []).length)) {
      setPanel({ title: "Peringkat varian", body: message?.error || "Ulasan tidak masuk." });
      return;
    }
    const reviews = message.reviews ?? [];
    setReviewRows(reviews);
    const result = await callFeatureProxy("variant_ranking", { reviews });
    if (!result.ok) {
      setRanking(null);
      setPanel({ title: "Peringkat varian", body: result.error });
      return;
    }
    setRanking(result.data);
    setPanel(message.error ? { title: "Peringkat varian", body: message.error } : null);
  }

  if (!settings) return null;
  const showCard = kind === "product" && !cardClosed;
  const marketBar = marketChrome(kind);
  const showScout = settings.showScout && marketBar !== null && !scoutClosed;
  const captions = product ? buildCaptions(product, market, settings.tone) : [];
  const visibleItems = adsOnly ? items.filter((item) => item.isAd) : items;
  const summary = kind === "shop" ? shopSummary(items) : null;
  const histogram = priceHistogram(items);

  const scout = (
    <ScoutPanel
      title={`${marketBar?.title ?? "Pencarian"} · ${scoutLabel} · ${items.length} produk`}
      marketTitle={marketBar?.title}
      initialAnalisa
      items={items}
      market={market}
      commissions={commissions}
      sort={sort}
      onSort={setSort}
      onOpen={(item) => window.open(item.url, "_blank", "noopener")}
      onCheckLive={() => void checkLive()}
      onExport={() => downloadText("elevate-affiliate.csv", scoutCsv(visibleItems, commissions))}
      checkLabel={checkLabel}
      onClose={() => (dockMount ? setScoutClosed(true) : setFloatOpen(false))}
      placement={dockMount ? "dock" : "float"}
      summary={summary}
      histogram={histogram}
      adsOnly={adsOnly}
      onAdsOnly={setAdsOnly}
      running={running}
      onStop={() => {
        stopRef.current = true;
        askPage({ type: "STOP_SOLDOUT" });
      }}
      onDeepen={() => void deepen()}
      onDeepenOne={(item) => void deepenOne(item)}
      onPaginate={() => void paginate()}
      onShopNote={kind === "shop" ? () => openMarketAi() : undefined}
      onMarketAi={(scope) => openMarketAi(kind === "shop" ? undefined : scope)}
      taskNote={taskNote}
      shopCtimes={shopCtimes}
      relation={kind === "shop" ? readShopRelation() : null}
      onShopAge={() => void fetchShopAges()}
      onAffiliate={() => void checkAffiliates()}
      onSoldOut={kind === "shop" ? () => void loadSoldOut() : undefined}
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
              affiliates: commission?.promotedLast7d != null ? `${commission.promotedLast7d} affiliate / 7 hari` : null,
            });
            if (hrefCard) downloadDataUrl(`elevate-${product.itemId}.png`, hrefCard);
          }}
          onZip={() => {
            if (!product) return;
            saveProductImages(product);
          }}
          onSummarize={() => void analyseProduct()}
          onThread={(angle) => void generateThread(angle)}
          onRank={() => void rankHere()}
          panel={panel}
          ranking={reviewRows.length || ranking ? <RankingList data={ranking} reviews={reviewRows} /> : null}
        />
      )}
      {kind === "product" && actionMount
        ? createPortal(
            <PageActions
              onAnalisa={() => setCardClosed(false)}
              onVariant={() => void rankHere()}
              onAi={() => void analyseProduct()}
              onThread={() => void generateThread("problem_solution")}
              onImages={() => {
                if (!product) return;
                saveProductImages(product);
              }}
            />,
            actionMount,
          )
        : null}
      {showScout && dockMount ? createPortal(scout, dockMount) : null}
      {showScout && !dockMount && floatOpen ? scout : null}
      {showScout && !dockMount && !floatOpen && marketBar ? (
        <MarketPill label={marketBar.pill} count={items.length} onOpen={() => setFloatOpen(true)} />
      ) : null}
      {aiOpen && (
        <MarketAiDialog
          subtitle={aiSubtitle}
          phase={aiPhase}
          text={aiText}
          onClose={() => setAiOpen(false)}
          onRegenerate={() => aiRun.current()}
          onOpenSettings={() => chrome.runtime.openOptionsPage()}
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
