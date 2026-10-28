import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "../shared/auth";
import { loadBooks, saveBooks, type Books } from "../shared/books";
import { formatMoney, marketFromHost } from "../shared/money";
import { classifyPortfolio, funnelBrief, mergeServerClass } from "../shared/funnel";
import { broadcastDraft, type CreatorRow, type IncomeParts, type PerfProduct } from "../shared/research";
import { stampAdTable } from "../shared/ad-badges";
import { stampPerfCards } from "../shared/perf-badges";
import { realProfit, type RoasInput } from "../shared/roas";
import { hppFor } from "../shared/reports";
import { callAiProxy, callFeatureProxy, countSavedContacts, pingFeature, reportShopeeAccount, saveContacts } from "../shared/server";
import { loadSettings } from "../shared/settings";
import { SOURCE, type Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { elevateCss } from "../ui/css";
import { FunnelBoard } from "../ui/FunnelBoard";
import { RoasCard } from "../ui/RoasCard";

type SellerKind = "ads" | "performance" | "order" | "broadcast" | "creators" | "other";

function sellerKind(href: string): SellerKind {
  const path = `${new URL(href).pathname}${new URL(href).search}`.toLowerCase();
  if (path.includes("pas") || path.includes("/ads") || path.includes("iklan")) return "ads";
  if (path.includes("performance") || path.includes("datacenter")) return "performance";
  if (path.includes("order")) return "order";
  if (path.includes("broadcast") || path.includes("crm")) return "broadcast";
  if (path.includes("creator") || path.includes("affiliate")) return "creators";
  return "other";
}

function SellerApp() {
  const [href, setHref] = useState(location.href);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [books, setBooks] = useState<Books | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [spend, setSpend] = useState("");
  const [tableNote, setTableNote] = useState<string | null>(null);
  const [rows, setRows] = useState<PerfProduct[]>([]);
  const [serverClass, setServerClass] = useState<unknown>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfNote, setPerfNote] = useState("Klik Analisa Funnel Produk untuk memuat 30 hari terakhir.");
  const [income, setIncome] = useState<IncomeParts | null>(null);
  const [incomeNote, setIncomeNote] = useState<string | null>("Komponen pendapatan belum masuk. Isi manual atau buka ulang pesanan.");
  const [manual, setManual] = useState({ price: "", fees: "", sku: "" });
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [draftKind, setDraftKind] = useState<"cart" | "arrival" | "promo">("cart");
  const kind = sellerKind(href);
  const market = marketFromHost("shopee.co.id");

  useEffect(() => {
    void loadSettings().then(setSettings);
    void loadBooks().then(setBooks);
    void loadSession().then((session) => {
      setEmail(session?.email ?? null);
      if (session?.userId) void countSavedContacts().then(setSavedCount);
    });
    const timer = window.setInterval(() => {
      if (location.href !== href) setHref(location.href);
    }, 800);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== location.origin) return;
      const data = event.data as {
        source?: string;
        channel?: string;
        type?: string;
        income?: IncomeParts | null;
        missing?: boolean;
        rows?: PerfProduct[] | CreatorRow[];
        done?: boolean;
        loaded?: number;
        total?: number;
        error?: string;
        shopeeUserId?: string;
        username?: string | null;
        shopId?: string | null;
      };
      if (!data || data.source !== SOURCE || data.channel !== "seller") return;
      if (data.type === "INCOME") {
        if (data.income) {
          setIncome(data.income);
          setIncomeNote(null);
        } else setIncomeNote("Komponen pendapatan tidak terbaca dari halaman ini.");
      }
      if (data.type === "PERFORMANCE_PROGRESS") {
        setPerfLoading(true);
        setPerfNote(`Memuat ${data.loaded ?? 0}/${data.total ?? 0} produk…`);
      }
      if (data.type === "PERFORMANCE_ERROR") {
        setPerfLoading(false);
        setPerfNote(data.error || "Performa tidak terbaca.");
      }
      if (data.type === "PERFORMANCE") {
        const list = (data.rows as PerfProduct[]) || [];
        setRows(list);
        setServerClass(null);
        setPerfNote(list.length ? `${list.length} produk terbaca. Kelas memakai median pengunjung dan konversi.` : "Angka performa tidak terbaca dari halaman ini.");
        if (data.done) {
          setPerfLoading(false);
          void callFeatureProxy("funnel_analysis", {
            items: list
              .filter((row) => row.id)
              .map((row) => ({
                id: row.id,
                impressions: row.impressions ?? null,
                uv: row.visitors ?? null,
                ctrPct: row.ctrPct ?? null,
                convPct: row.convPct ?? null,
                addToCartRatePct: row.addToCartPct ?? null,
                cartToCheckoutRatePct: row.cartToCheckoutPct ?? null,
              })),
          }).then((result) => {
            if (!result.ok) {
              setPerfNote(`${list.length} produk. Kelas lokal dari median pengunjung dan konversi. ${result.error}`);
              return;
            }
            const body = result.data !== null && typeof result.data === "object" ? (result.data as { results?: unknown[] }) : null;
            if (body && Array.isArray(body.results) && body.results.length) {
              setServerClass(result.data);
              setPerfNote(`${list.length} produk. Kelas mengikuti server.`);
              return;
            }
            setPerfNote(`${list.length} produk. Kelas lokal dari median pengunjung dan konversi.`);
          });
        }
      }
      if (data.type === "CREATORS") setCreators((data.rows as CreatorRow[]) || []);
      if (data.type === "ACCOUNT" && data.shopeeUserId) {
        void reportShopeeAccount({
          shopeeUserId: data.shopeeUserId,
          username: data.username ?? null,
          shopId: data.shopId ?? null,
          isSeller: true,
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [href]);

  const tiers = useMemo(() => {
    const local = classifyPortfolio(rows).rows;
    return serverClass ? mergeServerClass(local, serverClass) : local;
  }, [rows, serverClass]);

  useEffect(() => {
    if (kind !== "performance") return;
    const look = () => stampPerfCards(document, tiers);
    look();
    const timer = window.setInterval(look, 2000);
    return () => window.clearInterval(timer);
  }, [kind, href, tiers]);

  useEffect(() => {
    if (kind !== "ads" || !books) return;
    const ready = books.roas.hargaJual > 0 && books.roas.hpp > 0 ? books.roas : null;
    const look = () => {
      const stamped = stampAdTable(document, ready);
      setTableNote(stamped ? "Badge laba memakai HPP kalkulator, setelah PPN topup 11%." : "Tabel iklan belum ketemu di halaman ini.");
    };
    look();
    const timer = window.setInterval(look, 2000);
    return () => window.clearInterval(timer);
  }, [kind, href, books]);

  function updateRoas(next: RoasInput) {
    if (!books) return;
    const updated = { ...books, roas: next };
    setBooks(updated);
    void saveBooks(updated);
  }

  const draft = broadcastDraft(draftKind, "toko ini");
  const price = income?.price || Number(manual.price) || 0;
  const fees = income?.fees || Number(manual.fees) || 0;
  const sku = income?.sku || manual.sku;
  const hpp = books ? hppFor(books.hpp, sku) : 0;
  const profit = price ? realProfit({ price: income?.income || price, fees, hpp, ads: 0 }) : null;

  async function gemini(feature: string, payload: Record<string, unknown>, fallback: string) {
    if (!settings) return;
    if (!email || !settings.geminiApiKey) {
      setNote("Login Google tim dan API key Gemini diperlukan. Draf di atas tetap bisa disalin.");
      return;
    }
    setNote("Menghubungi Gemini…");
    void pingFeature(feature);
    const result = await callAiProxy(feature, payload, settings.geminiApiKey, settings.geminiModel);
    setNote(result.ok ? result.text : result.error || fallback);
  }

  if (!settings || !books) return null;

  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <aside className="ea-card ea-seller" aria-label="Elevate Seller">
        <div className="ea-head">
          <div className="ea-mark">E</div>
          <div className="ea-brand">
            Elevate Affiliate
            <small>{email ? email : "Alat lokal, tanpa login"}</small>
          </div>
        </div>
        <div className="ea-body">
          {kind === "other" && (
            <div className="ea-empty">
              <strong>Buka halaman Seller Center.</strong>
              Iklan, performa produk, pesanan, broadcast, atau kreator.
            </div>
          )}
          {kind === "ads" && (
            <RoasCard value={books.roas} onChange={updateRoas} spend={spend} onSpend={setSpend} tableNote={tableNote} />
          )}
          {kind === "performance" && (
            <>
              <div className="ea-actions">
                <button
                  className="ea-btn primary"
                  type="button"
                  disabled={perfLoading}
                  onClick={() => {
                    setPerfLoading(true);
                    setPerfNote("Memuat…");
                    window.postMessage({ source: SOURCE, channel: "seller-request", type: "FETCH_PERFORMANCE" }, location.origin);
                  }}
                >
                  {perfLoading ? "Memuat…" : rows.length ? "Refresh Analisa Funnel" : "Analisa Funnel Produk"}
                </button>
                {perfLoading && (
                  <button
                    className="ea-btn"
                    type="button"
                    onClick={() => window.postMessage({ source: SOURCE, channel: "seller-request", type: "STOP_PERFORMANCE" }, location.origin)}
                  >
                    Stop
                  </button>
                )}
                <button
                  className="ea-btn"
                  type="button"
                  onClick={() => void gemini("funnel_analysis", { brief: funnelBrief(tiers), rows: tiers.slice(0, 40) }, "Catatan funnel belum tersedia.")}
                >
                  Analisa AI
                </button>
              </div>
              <FunnelBoard rows={tiers} note={perfNote} />
            </>
          )}
          {kind === "order" && (
            <>
              {incomeNote && <p className="ea-note">{incomeNote}</p>}
              <div className="ea-field">
                <label htmlFor="ea-order-price">Harga</label>
                <input id="ea-order-price" type="number" value={manual.price || income?.price || ""} onChange={(event) => setManual({ ...manual, price: event.target.value })} />
              </div>
              <div className="ea-field">
                <label htmlFor="ea-order-fees">Biaya</label>
                <input id="ea-order-fees" type="number" value={manual.fees || income?.fees || ""} onChange={(event) => setManual({ ...manual, fees: event.target.value })} />
              </div>
              <div className="ea-field">
                <label htmlFor="ea-order-sku">SKU</label>
                <input id="ea-order-sku" type="text" value={manual.sku || income?.sku || ""} onChange={(event) => setManual({ ...manual, sku: event.target.value })} />
              </div>
              <div className="ea-commission">
                <div>
                  <div className="ea-kicker">Laba setelah HPP</div>
                  <div className="ea-amount">{profit === null ? "—" : formatMoney(profit, market)}</div>
                </div>
              </div>
              <p className="ea-note">HPP SKU ini: {hpp ? formatMoney(hpp, market) : "belum diisi di dashboard laba"}.</p>
            </>
          )}
          {kind === "broadcast" && (
            <>
              <div className="ea-sort">
                {(["cart", "arrival", "promo"] as const).map((id) => (
                  <button key={id} type="button" aria-pressed={draftKind === id} onClick={() => setDraftKind(id)}>
                    {id === "cart" ? "Keranjang" : id === "arrival" ? "Baru datang" : "Promo"}
                  </button>
                ))}
              </div>
              <div className="ea-panel-text">{draft}</div>
              <div className="ea-actions">
                <button className="ea-btn primary" type="button" onClick={() => void copyText(draft)}>
                  Salin draf
                </button>
                <button
                  className="ea-btn"
                  type="button"
                  onClick={() => void gemini("broadcast_message", { kind: draftKind, draft }, draft)}
                >
                  Minta Gemini
                </button>
              </div>
            </>
          )}
          {kind === "creators" && (
            <>
              <p className="ea-note">
                {creators.length
                  ? `${creators.length} kreator dari halaman yang sedang terbuka.`
                  : "Buka halaman kreator. Elevate hanya menyimpan kontak dari respons yang sudah dimuat."}
              </p>
              <p className="ea-note">Kontak tersimpan: {savedCount === null ? "masuk dulu untuk melihat jumlah" : savedCount}.</p>
              {creators.slice(0, 6).map((row) => (
                <div key={row.affiliateId} className="ea-item">
                  <b>{row.name}</b>
                  <span>{row.phone || row.email || "tanpa kontak di payload ini"}</span>
                </div>
              ))}
              <button
                className="ea-btn primary"
                type="button"
                onClick={() => {
                  void pingFeature("affiliate_contacts");
                  void saveContacts(creators).then((result) => {
                    if (!result.ok) setNote(result.error);
                    else {
                      setNote(`${result.count} kontak dikirim.`);
                      void countSavedContacts().then(setSavedCount);
                    }
                  });
                }}
              >
                Simpan kontak halaman ini
              </button>
            </>
          )}
          {note && <div className="ea-panel-text">{note}</div>}
          <div className="ea-actions">
            <button className="ea-btn" type="button" onClick={() => chrome.runtime.sendMessage({ type: "EA_OPEN_DASHBOARD" })}>
              Buka laba
            </button>
            <button className="ea-btn" type="button" onClick={() => chrome.runtime.sendMessage({ type: "EA_OPEN_OPTIONS" })}>
              Pengaturan
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

const host = document.createElement("div");
host.id = "elevate-seller-host";
host.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;";
const shadow = host.attachShadow({ mode: "open" });
const mount = document.createElement("div");
shadow.appendChild(mount);
document.documentElement.appendChild(host);
createRoot(mount).render(<SellerApp />);
