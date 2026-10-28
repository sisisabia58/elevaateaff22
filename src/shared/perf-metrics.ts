import { computeProfitBersih, parseShopeeNumber, profitBadgeText, type RoasInput } from "./roas";

export type PerfStripInput = {
  sales: number | null;
  adSpend: number | null;
  impressions: number | null;
  clicks: number | null;
  orders: number | null;
  ppn?: number;
};

export type PerfExtras = {
  adSpendActual: number;
  roasActual: number | null;
  conversionPct: number | null;
  cpc: number | null;
  cpcActual: number | null;
  acosPct: number | null;
  acosActualPct: number | null;
  rpm: number | null;
};

export function perfExtras(input: PerfStripInput): PerfExtras | null {
  if (input.sales == null || input.adSpend == null || input.impressions == null) return null;
  const ppn = input.ppn ?? 11;
  const adSpendActual = input.adSpend * (1 + ppn / 100);
  const clicks = input.clicks;
  const orders = input.orders;
  return {
    adSpendActual,
    roasActual: adSpendActual > 0 ? input.sales / adSpendActual : null,
    conversionPct: clicks != null && clicks > 0 && orders != null ? (orders / clicks) * 100 : null,
    cpc: clicks != null && clicks > 0 ? input.adSpend / clicks : null,
    cpcActual: clicks != null && clicks > 0 ? adSpendActual / clicks : null,
    acosPct: input.sales > 0 ? (input.adSpend / input.sales) * 100 : null,
    acosActualPct: input.sales > 0 ? (adSpendActual / input.sales) * 100 : null,
    rpm: input.impressions > 0 ? (input.sales / input.impressions) * 1000 : null,
  };
}

const ALIASES: Record<string, string[]> = {
  impressions: ["Iklan Dilihat", "Impressions"],
  clicks: ["Jumlah Klik", "Clicks"],
  orders: ["Pesanan", "Orders"],
  units: ["Produk Terjual", "Items Sold"],
  sales: ["Penjualan", "Sales"],
  adSpend: ["Biaya Iklan", "Expense"],
  roas: ["ROAS"],
};

type MetricNode = { key: string; value: number | null; item: HTMLElement };

function canonical(label: string): string | null {
  for (const [key, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(label)) return key;
  }
  return null;
}

function readStrip(container: Element): MetricNode[] {
  const found: MetricNode[] = [];
  for (const item of container.querySelectorAll(".metric-item")) {
    if (!(item instanceof HTMLElement)) continue;
    const label = (item.querySelector(".top .title")?.textContent || "").trim();
    const key = canonical(label);
    if (!key) continue;
    const valueText = item.querySelector(".content .text")?.textContent || "";
    found.push({ key, value: parseShopeeNumber(valueText), item });
  }
  return found;
}

function rupiah(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function orangeBadge(parent: HTMLElement, className: string, text: string, title: string) {
  const content = parent.querySelector(".content") ?? parent;
  let badge = content.querySelector(`:scope > .${className}`) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("div");
    badge.className = className;
    badge.style.cssText = "margin-top:4px;display:block;width:100%;box-sizing:border-box;padding:2px 8px;border-radius:4px;background:#ee4d2d;color:#fff;font-size:11px;font-weight:700;";
    content.appendChild(badge);
  }
  badge.dataset.badgeKey = text;
  badge.textContent = text;
  badge.title = title;
}

function summaryBadge(item: HTMLElement, text: string, title: string, background: string) {
  const content = item.querySelector(".content");
  if (!content) return;
  let badge = content.querySelector(":scope > .ea-profit-summary") as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("div");
    badge.className = "ea-profit-summary";
    badge.style.cssText = "margin-top:4px;display:block;width:100%;box-sizing:border-box;padding:2px 8px;border-radius:4px;color:#fff;font-size:11px;font-weight:700;";
    content.appendChild(badge);
  }
  badge.style.background = background;
  badge.dataset.badgeKey = text;
  badge.textContent = text;
  badge.title = title;
}

function ensureStyle() {
  if (document.getElementById("ea-perf-metrics-style")) return;
  const style = document.createElement("style");
  style.id = "ea-perf-metrics-style";
  style.textContent = `
    .line-metrics[data-testid="line-metrics"] { max-height: none !important; height: auto !important; overflow: visible !important; }
    #ea-perf-metrics { display: block; grid-column: 1 / -1; width: 100%; margin-top: 16px; font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif; }
    #ea-perf-metrics .ea-perf-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    #ea-perf-metrics .ea-perf-toolbar b { font-size: 13px; }
    #ea-perf-metrics .ea-perf-ai { border: 1px solid #ee4d2d; background: #fff; color: #ee4d2d; border-radius: 6px; padding: 6px 14px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
    #ea-perf-metrics .ea-perf-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    #ea-perf-metrics .ea-perf-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
    #ea-perf-metrics .ea-perf-card span { display: block; font-size: 13px; color: #6b7280; margin-bottom: 6px; }
    #ea-perf-metrics .ea-perf-card strong { font-size: 20px; font-weight: 600; color: #1f2430; }
    #ea-perf-metrics .ea-perf-badge { display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 4px; background: #ee4d2d; color: #fff; font-size: 11px; font-weight: 700; }
    @media (max-width: 720px) { #ea-perf-metrics .ea-perf-grid { grid-template-columns: 1fr 1fr; } }
  `;
  document.head.appendChild(style);
}

function card(label: string, value: string, extra: string, title: string): string {
  return `<div class="ea-perf-card" title="${title}"><span>${label}</span><strong>${value}</strong>${extra}</div>`;
}

function tableProfit(root: ParentNode, preset: RoasInput | null): { text: string; title: string; background: string } | null {
  const ready = Boolean(preset && preset.hargaJual > 0 && preset.hpp > 0);
  let total = 0;
  let profit = 0;
  for (const table of root.querySelectorAll("table")) {
    if (!(table instanceof HTMLTableElement)) continue;
    const headers = [...table.querySelectorAll("thead th")].map((header) => (header.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
    const salesIndex = headers.findIndex((header) => header === "penjualan");
    const unitsIndex = headers.findIndex((header) => header === "produk terjual");
    if (salesIndex < 0 || unitsIndex < 0) continue;
    const ordersIndex = headers.findIndex((header) => header === "konversi");
    const adsIndex = headers.findIndex((header) => header === "biaya iklan");
    for (const row of table.querySelectorAll("tbody tr")) {
      if (!(row instanceof HTMLTableRowElement)) continue;
      const sales = parseShopeeNumber(plainCell(row.cells[salesIndex]));
      const units = parseShopeeNumber(plainCell(row.cells[unitsIndex]));
      if (sales == null || units == null || units <= 0) continue;
      total += 1;
      if (!ready || !preset) continue;
      profit += computeProfitBersih({
        penjualan: sales,
        produkTerjual: units,
        konversi: ordersIndex < 0 ? null : parseShopeeNumber(plainCell(row.cells[ordersIndex])),
        biayaIklanAsli: adsIndex < 0 ? 0 : (parseShopeeNumber(plainCell(row.cells[adsIndex])) ?? 0),
        preset,
      }).profitBersih;
    }
  }
  if (!total) return null;
  if (!ready) {
    return {
      text: "Perlu Setup",
      title: "Isi HPP dan harga jual di kalkulator ROAS supaya profit iklan bisa dijumlah.",
      background: "#9aa1ac",
    };
  }
  return {
    text: `${profitBadgeText(profit)} (${total}/${total})`,
    title: `Jumlah profit bersih ${total} baris tabel, setelah PPN topup iklan.`,
    background: profit >= 0 ? "#27ae60" : "#ee4d2d",
  };
}

function plainCell(cell: Element | undefined): string {
  if (!cell) return "";
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".ea-profit-badge,.ea-roas-badge,.ea-ad-aktual,.ea-cpc-aktual,.ea-acos-aktual,.ea-profit-summary").forEach((node) => node.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

export function stampPerfMetrics(root: ParentNode, preset: RoasInput | null): boolean {
  const container = root.querySelector('.line-metrics[data-testid="line-metrics"]');
  if (!(container instanceof HTMLElement)) {
    root.querySelector("#ea-perf-metrics")?.remove();
    return false;
  }
  ensureStyle();
  const metrics = readStrip(container);
  const value = (key: string) => metrics.find((metric) => metric.key === key)?.value ?? null;
  const item = (key: string) => metrics.find((metric) => metric.key === key)?.item;
  const extras = perfExtras({
    sales: value("sales"),
    adSpend: value("adSpend"),
    impressions: value("impressions"),
    clicks: value("clicks"),
    orders: value("orders"),
    ppn: preset?.ppnTopupPersen,
  });
  const salesItem = item("sales");
  const summary = tableProfit(root, preset) ?? (extras && salesItem && value("units") && preset && preset.hargaJual > 0 && preset.hpp > 0
    ? (() => {
        const result = computeProfitBersih({
          penjualan: value("sales") as number,
          produkTerjual: value("units") as number,
          konversi: value("orders"),
          biayaIklanAsli: value("adSpend") ?? 0,
          preset,
        });
        return {
          text: profitBadgeText(result.profitBersih),
          title: "Profit bersih kartu ini, setelah PPN topup iklan.",
          background: result.profitBersih >= 0 ? "#27ae60" : "#ee4d2d",
        };
      })()
    : null);
  if (salesItem && summary) summaryBadge(salesItem, summary.text, summary.title, summary.background);
  else salesItem?.querySelector(".ea-profit-summary")?.remove();

  if (!extras) {
    root.querySelector("#ea-perf-metrics")?.remove();
    return Boolean(summary);
  }
  const spendItem = item("adSpend");
  if (spendItem) {
    orangeBadge(
      spendItem,
      "ea-strip-aktual",
      `Aktual ${rupiah(extras.adSpendActual).replace("Rp ", "Rp")}`,
      "Biaya Iklan Aktual = Biaya Iklan × 1,11 (termasuk PPN 11% topup saldo iklan)",
    );
  }
  const roasItem = item("roas");
  if (roasItem && value("roas") != null) {
    orangeBadge(roasItem, "ea-strip-aktual", `Aktual ${extras.roasActual == null ? "-" : extras.roasActual.toFixed(2)}`, "ROAS Aktual = Penjualan ÷ Biaya Iklan Aktual");
  }
  const signature = JSON.stringify(extras);
  let row = root.querySelector("#ea-perf-metrics");
  if (!(row instanceof HTMLElement) || row.dataset.signature !== signature) {
    row?.remove();
    const next = document.createElement("div");
    next.id = "ea-perf-metrics";
    next.dataset.signature = signature;
    const aktual = (amount: number | null) => (amount == null ? "" : `<div class="ea-perf-badge">Aktual ${rupiah(amount)}</div>`);
    next.innerHTML = `
      <div class="ea-perf-toolbar">
        <b>Metrik Tambahan (Kalkulator ROAS)</b>
        <button type="button" class="ea-perf-ai" id="ea-ads-insight">Analisa Iklan</button>
      </div>
      <div class="ea-perf-grid">
        ${card("Tingkat Konversi", extras.conversionPct == null ? "-" : `${extras.conversionPct.toFixed(2)}%`, "", "Tingkat Konversi = Pesanan ÷ Jumlah Klik")}
        ${card("Biaya Per-Klik", rupiah(extras.cpc), aktual(extras.cpcActual), "Biaya Per-Klik = Biaya Iklan ÷ Jumlah Klik")}
        ${card("ACOS", extras.acosPct == null ? "-" : `${extras.acosPct.toFixed(2)}%`, extras.acosActualPct == null ? "" : `<div class="ea-perf-badge">Aktual ${extras.acosActualPct.toFixed(2)}%</div>`, "ACOS = Biaya Iklan ÷ Penjualan")}
        ${card("RPM", rupiah(extras.rpm), "", "RPM = Penjualan ÷ Iklan Dilihat × 1000")}
      </div>
    `;
    container.insertAdjacentElement("afterend", next);
    next.querySelector("#ea-ads-insight")?.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("ea-ads-insight", { detail: extras }));
    });
  }
  return true;
}
