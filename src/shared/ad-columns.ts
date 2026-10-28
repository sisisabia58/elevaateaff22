import { matchPreset, type RoasPreset } from "./presets";
import { adRoasLabel, computeProfitBersih, parseShopeeNumber, profitBadgeText } from "./roas";

const PROFIT = "ea-profit-badge";
const ZONE = "ea-roas-badge";
const AD = "ea-ad-aktual";
const CPC = "ea-cpc-aktual";
const ACOS = "ea-acos-aktual";

export const ROAS_NUMBER_RE = /^\d{1,3}(,\d{1,2})?$/;
export const RUPIAH_NUMBER_RE = /^Rp\s?\d{1,3}(\.\d{3})*(,\d{1,2})?$/i;
export const PERCENT_NO_SIGN_RE = /^\d{1,3}(,\d{1,2})?%$/;
export const COUNT_NUMBER_RE = /^\d{1,3}(\.\d{3})*$|^\d+([.,]\d+)?\s?(k|rb|jt|m|b)$/i;

const LABEL_ALIASES: Record<string, string[]> = {
  Penjualan: ["Penjualan", "Sales"],
  "Produk Terjual": ["Produk Terjual", "Items Sold"],
  Konversi: ["Konversi", "Conversions", "Orders"],
  "Biaya Iklan": ["Biaya Iklan", "Expense"],
  ROAS: ["ROAS"],
  "Biaya per Konversi": ["Biaya per Konversi", "Cost per Conversion"],
  "Persentase Biaya Iklan (ACOS)": ["Persentase Biaya Iklan (ACOS)", "ACOS"],
};

const TONE = { good: "#27ae60", mid: "#f2b90c", bad: "#ee4d2d", setup: "#9aa1ac" };

export type ColumnHeader = { label: string; x: number; width: number };
export type ColumnNumber = { text: string; x: number; y: number };
export type ColumnTitle = { text: string; y: number; productId?: string | null };

export type ColumnRowBadge = {
  title: string;
  productId: string | null;
  profit: string;
  zone: string | null;
  ad: string | null;
  cpc: string | null;
  acos: string | null;
};

export function labelCandidates(label: string): string[] {
  return LABEL_ALIASES[label] || [label];
}

export function isProductTitle(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 30 && !/^rp\s?[\d.,]+$/i.test(trimmed);
}

export function headerCenterX(headers: ColumnHeader[], canonical: string): number | null {
  const names = labelCandidates(canonical);
  const hit = headers.find((header) => header.width > 0 && names.includes(header.label.trim()));
  return hit ? hit.x : null;
}

export function numbersNear(cells: ColumnNumber[], columnX: number, pattern: RegExp, tolerance = 45): ColumnNumber[] {
  return cells.filter((cell) => pattern.test(cell.text.trim()) && Math.abs(cell.x - columnX) < tolerance);
}

export function closestByY<T extends { y: number }>(y: number, list: T[], limit = 90): T | null {
  let best: T | null = null;
  let bestDist = Infinity;
  for (const item of list) {
    const dist = Math.abs(item.y - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = item;
    }
  }
  return best && bestDist <= limit ? best : null;
}

export function adAktualLabel(amount: number, ppnPersen = 11): string {
  return `Ad Rp${Math.round(amount * (1 + ppnPersen / 100)).toLocaleString("id-ID")}`;
}

export function columnBadges(
  input: { headers: ColumnHeader[]; numbers: ColumnNumber[]; titles: ColumnTitle[] },
  presets: Record<string, RoasPreset>,
): ColumnRowBadge[] {
  const penjualanX = headerCenterX(input.headers, "Penjualan");
  const soldX = headerCenterX(input.headers, "Produk Terjual");
  if (penjualanX == null || soldX == null) return [];
  const salesCells = numbersNear(input.numbers, penjualanX, RUPIAH_NUMBER_RE);
  const soldCells = numbersNear(input.numbers, soldX, COUNT_NUMBER_RE);
  const ordersX = headerCenterX(input.headers, "Konversi");
  const orderCells = ordersX == null ? [] : numbersNear(input.numbers, ordersX, COUNT_NUMBER_RE);
  const adsX = headerCenterX(input.headers, "Biaya Iklan");
  const adCells = adsX == null ? [] : numbersNear(input.numbers, adsX, RUPIAH_NUMBER_RE, 80);
  const roasX = headerCenterX(input.headers, "ROAS");
  const roasCells = roasX == null ? [] : numbersNear(input.numbers, roasX, ROAS_NUMBER_RE);
  const cpcX = headerCenterX(input.headers, "Biaya per Konversi");
  const cpcCells = cpcX == null ? [] : numbersNear(input.numbers, cpcX, RUPIAH_NUMBER_RE, 80);
  const acosX = headerCenterX(input.headers, "Persentase Biaya Iklan (ACOS)");
  const acosCells = acosX == null ? [] : numbersNear(input.numbers, acosX, PERCENT_NO_SIGN_RE, 80);
  const titles = input.titles.filter((title) => isProductTitle(title.text));
  const rows: ColumnRowBadge[] = [];
  for (const sale of salesCells) {
    const sales = parseShopeeNumber(sale.text);
    const sold = closestByY(sale.y, soldCells);
    const title = closestByY(sale.y, titles);
    const units = sold ? parseShopeeNumber(sold.text) : null;
    if (sales == null || !title || units == null || units <= 0) continue;
    const productId = title.productId ? String(title.productId) : null;
    const matched = matchPreset(presets, { title: title.text, productId });
    const preset = matched && matched.preset.hargaJual > 0 && matched.preset.hpp > 0 ? matched.preset : null;
    const ppnPersen = preset?.ppnTopupPersen ?? 11;
    const orders = closestByY(sale.y, orderCells);
    const ads = closestByY(sale.y, adCells);
    const roas = closestByY(sale.y, roasCells);
    const cpc = closestByY(sale.y, cpcCells);
    const acos = closestByY(sale.y, acosCells);
    const adSpend = ads ? parseShopeeNumber(ads.text) : null;
    const shown = roas ? parseShopeeNumber(roas.text) : null;
    const cpcValue = cpc ? parseShopeeNumber(cpc.text) : null;
    const acosValue = acos ? parseShopeeNumber(acos.text) : null;
    let profit = "Perlu Setup";
    let zone: string | null = shown == null ? null : "Perlu Setup";
    if (preset) {
      const result = computeProfitBersih({
        penjualan: sales,
        produkTerjual: units,
        konversi: orders ? parseShopeeNumber(orders.text) : null,
        biayaIklanAsli: adSpend ?? 0,
        preset,
      });
      profit = profitBadgeText(result.profitBersih);
      if (shown != null) zone = adRoasLabel(shown, preset);
    }
    const ppn = 1 + ppnPersen / 100;
    rows.push({
      title: title.text.trim(),
      productId,
      profit,
      zone,
      ad: adSpend != null && adSpend > 0 ? adAktualLabel(adSpend, ppnPersen) : null,
      cpc: cpcValue != null && cpcValue > 0 ? `BpK Rp${Math.round(cpcValue * ppn).toLocaleString("id-ID")}` : null,
      acos: acosValue == null ? null : `ACOS Aktual ${(acosValue * ppn).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    });
  }
  return rows;
}

type MeasuredNumber = ColumnNumber & { el: HTMLElement };
type MeasuredTitle = ColumnTitle & { el: HTMLElement };

function measure(el: Element): { x: number; y: number; width: number; height: number } | null {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none" || Number.parseFloat(style.opacity) === 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, width: rect.width, height: rect.height };
}

function productIdFor(titleEl: Element): string | null {
  const container = titleEl.closest(".info-container") ?? titleEl.parentElement;
  if (!container) return null;
  const link = container.querySelector('a[href*="/product/manual/"]')?.getAttribute("href") || "";
  const fromLink = link.match(/\/product\/manual(?:-[a-z0-9]+)?\/(\d+)/i);
  if (fromLink) return fromLink[1];
  const blob = (container.textContent || "").replace(/\s+/g, " ");
  return blob.match(/ID Produk:\s*(\d+)/i)?.[1] ?? null;
}

function upsert(parent: HTMLElement, className: string, text: string, title: string, background: string) {
  let badge = parent.querySelector(`:scope > .${className}`) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("span");
    badge.className = className;
    badge.style.cssText = "display:inline-block;margin-left:6px;margin-top:4px;padding:2px 8px;border-radius:4px;color:#fff;font-size:11px;font-weight:700;white-space:nowrap;";
    parent.appendChild(badge);
  }
  badge.style.background = background;
  badge.textContent = text;
  badge.title = title;
}

function clearBadge(parent: HTMLElement, className: string) {
  parent.querySelector(`:scope > .${className}`)?.remove();
}

function toneFor(label: string): string {
  if (label === "Bagus") return TONE.good;
  if (label === "Rugi") return TONE.bad;
  if (label === "Cukup") return TONE.mid;
  return TONE.setup;
}

export function stampAdColumns(root: ParentNode, presets: Record<string, RoasPreset>): number {
  const penjualanX = headerCenter(root, "Penjualan");
  const soldX = headerCenter(root, "Produk Terjual");
  if (penjualanX == null || soldX == null) return 0;
  const salesCells = numberCells(root, penjualanX, RUPIAH_NUMBER_RE);
  const soldCells = numberCells(root, soldX, COUNT_NUMBER_RE);
  const ordersX = headerCenter(root, "Konversi");
  const orderCells = ordersX == null ? [] : numberCells(root, ordersX, COUNT_NUMBER_RE);
  const adsX = headerCenter(root, "Biaya Iklan");
  const adCells = adsX == null ? [] : numberCells(root, adsX, RUPIAH_NUMBER_RE, 80);
  const roasX = headerCenter(root, "ROAS");
  const roasCells = roasX == null ? [] : numberCells(root, roasX, ROAS_NUMBER_RE);
  const cpcX = headerCenter(root, "Biaya per Konversi");
  const cpcCells = cpcX == null ? [] : numberCells(root, cpcX, RUPIAH_NUMBER_RE, 80);
  const acosX = headerCenter(root, "Persentase Biaya Iklan (ACOS)");
  const acosCells = acosX == null ? [] : numberCells(root, acosX, PERCENT_NO_SIGN_RE, 80);
  const titles = titleCells(root);
  let stamped = 0;
  for (const sale of salesCells) {
    const parent = sale.el.parentElement instanceof HTMLElement ? sale.el.parentElement : sale.el;
    const sales = parseShopeeNumber(sale.text);
    const sold = closestByY(sale.y, soldCells);
    const title = closestByY(sale.y, titles);
    const units = sold ? parseShopeeNumber(sold.text) : null;
    if (sales == null || !title || units == null || units <= 0) {
      clearBadge(parent, PROFIT);
      continue;
    }
    stamped += 1;
    const matched = matchPreset(presets, { title: title.text, productId: title.productId ?? null });
    const preset = matched && matched.preset.hargaJual > 0 && matched.preset.hpp > 0 ? matched.preset : null;
    const ppnPersen = preset?.ppnTopupPersen ?? 11;
    const orders = closestByY(sale.y, orderCells);
    const ads = closestByY(sale.y, adCells);
    const roas = closestByY(sale.y, roasCells);
    if (!preset) {
      upsert(parent, PROFIT, "Perlu Setup", "Simpan preset dengan nama yang ada di judul, atau ID produk yang sama.", TONE.setup);
    } else {
      const result = computeProfitBersih({
        penjualan: sales,
        produkTerjual: units,
        konversi: orders ? parseShopeeNumber(orders.text) : null,
        biayaIklanAsli: ads ? parseShopeeNumber(ads.text) ?? 0 : 0,
        preset,
      });
      upsert(
        parent,
        PROFIT,
        profitBadgeText(result.profitBersih),
        `Preset ${matched?.name}. Penjualan ${Math.round(sales).toLocaleString("id-ID")} − modal ${Math.round(result.modal).toLocaleString("id-ID")} − iklan termasuk PPN ${Math.round(result.biayaIklanAktual).toLocaleString("id-ID")}`,
        result.profitBersih >= 0 ? TONE.good : TONE.bad,
      );
    }
    if (roas) {
      const roasParent = roas.el.parentElement instanceof HTMLElement ? roas.el.parentElement : roas.el;
      const shown = parseShopeeNumber(roas.text);
      if (shown == null) clearBadge(roasParent, ZONE);
      else if (!preset) upsert(roasParent, ZONE, "Perlu Setup", "Simpan preset dengan nama yang ada di judul, atau ID produk yang sama.", TONE.setup);
      else {
        const label = adRoasLabel(shown, preset);
        upsert(roasParent, ZONE, label, `Preset ${matched?.name}. ROAS tampilan ${shown}. Zona memakai ROAS setelah PPN topup.`, toneFor(label));
      }
    }
    stampAktual(ads, AD, adAktualLabel, ppnPersen, "Biaya Iklan Aktual = Biaya Iklan × (1 + PPN topup)");
    const cpc = closestByY(sale.y, cpcCells);
    if (cpc) {
      const value = parseShopeeNumber(cpc.text);
      const host = cpc.el.parentElement instanceof HTMLElement ? cpc.el.parentElement : cpc.el;
      if (value != null && value > 0) upsert(host, CPC, `BpK Rp${Math.round(value * (1 + ppnPersen / 100)).toLocaleString("id-ID")}`, "Biaya per Konversi Aktual = Biaya per Konversi × (1 + PPN topup)", "#ee4d2d");
      else clearBadge(host, CPC);
    }
    const acos = closestByY(sale.y, acosCells);
    if (acos) {
      const value = parseShopeeNumber(acos.text);
      const host = acos.el.parentElement instanceof HTMLElement ? acos.el.parentElement : acos.el;
      if (value == null) clearBadge(host, ACOS);
      else upsert(host, ACOS, `ACOS Aktual ${(value * (1 + ppnPersen / 100)).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, "ACOS Aktual = ACOS × (1 + PPN topup)", "#ee4d2d");
    }
  }
  return stamped;
}

function stampAktual(
  cell: MeasuredNumber | null,
  className: string,
  label: (amount: number, ppnPersen?: number) => string,
  ppnPersen: number,
  title: string,
) {
  if (!cell) return;
  const host = cell.el.parentElement instanceof HTMLElement ? cell.el.parentElement : cell.el;
  const amount = parseShopeeNumber(cell.text);
  if (amount == null || amount <= 0) {
    clearBadge(host, className);
    return;
  }
  upsert(host, className, label(amount, ppnPersen), title, "#ee4d2d");
}

function headerCenter(root: ParentNode, canonical: string): number | null {
  const names = labelCandidates(canonical);
  for (const header of root.querySelectorAll(".title-label")) {
    if (!names.includes((header.textContent || "").trim())) continue;
    const box = measure(header);
    if (box) return box.x;
  }
  return null;
}

function numberCells(root: ParentNode, columnX: number, pattern: RegExp, tolerance = 45): MeasuredNumber[] {
  const matches: MeasuredNumber[] = [];
  for (const cell of root.querySelectorAll(".report-format-number")) {
    if (!(cell instanceof HTMLElement)) continue;
    const text = (cell.textContent || "").trim();
    if (!pattern.test(text)) continue;
    const box = measure(cell);
    if (!box || Math.abs(box.x - columnX) >= tolerance) continue;
    matches.push({ text, x: box.x, y: box.y, el: cell });
  }
  return matches;
}

function titleCells(root: ParentNode): MeasuredTitle[] {
  const titles: MeasuredTitle[] = [];
  for (const node of root.querySelectorAll(".ellipsis-content")) {
    if (!(node instanceof HTMLElement)) continue;
    const text = (node.textContent || "").trim();
    if (!isProductTitle(text)) continue;
    const box = measure(node);
    if (!box) continue;
    titles.push({ text, y: box.y, productId: productIdFor(node), el: node });
  }
  return titles;
}
