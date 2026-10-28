import { adRoasLabel, computeProfitBersih, parseShopeeNumber, profitBadgeText, type RoasInput } from "./roas";

const PROFIT = "ea-profit-badge";
const ZONE = "ea-roas-badge";

function columnIndex(table: HTMLTableElement, label: string): number | null {
  const headers = [...table.querySelectorAll("thead th")];
  const index = headers.findIndex((header) => (header.textContent || "").toLowerCase().includes(label.toLowerCase()));
  return index >= 0 ? index : null;
}

function cellText(row: HTMLTableRowElement, index: number | null): string {
  if (index == null) return "";
  return (row.cells[index]?.textContent || "").replace(/\s+/g, " ").trim();
}

function place(cell: HTMLElement, className: string, text: string, title: string, tone: "good" | "bad" | "mid" | "setup") {
  let badge = cell.querySelector(`:scope > .${className}`) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("div");
    badge.className = className;
    badge.style.cssText = "margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;";
    cell.appendChild(badge);
  }
  const color = tone === "good" ? "#0f6e56" : tone === "bad" ? "#9f1239" : tone === "mid" ? "#8a5a12" : "#5c564e";
  const background = tone === "good" ? "#e5f4ee" : tone === "bad" ? "#fde8ee" : tone === "mid" ? "#f8efd8" : "#f3efe7";
  badge.style.color = color;
  badge.style.background = background;
  badge.textContent = text;
  badge.title = title;
}

export function stampAdTable(root: ParentNode, preset: RoasInput | null): number {
  const ready = Boolean(preset && preset.hargaJual > 0 && preset.hpp > 0);
  let stamped = 0;
  for (const table of root.querySelectorAll("table")) {
    if (!(table instanceof HTMLTableElement)) continue;
    const penjualan = columnIndex(table, "Penjualan");
    const sold = columnIndex(table, "Produk Terjual");
    if (penjualan == null || sold == null) continue;
    const orders = columnIndex(table, "Konversi");
    const ads = columnIndex(table, "Biaya Iklan");
    const roas = columnIndex(table, "ROAS");
    for (const row of table.querySelectorAll("tbody tr")) {
      if (!(row instanceof HTMLTableRowElement)) continue;
      const sales = parseShopeeNumber(cellText(row, penjualan));
      const units = parseShopeeNumber(cellText(row, sold));
      const host = row.cells[penjualan];
      if (!host || sales == null || units == null || units <= 0) continue;
      if (!ready || !preset) {
        place(host, PROFIT, "Perlu Setup", "Isi HPP dan harga jual di kalkulator ROAS.", "setup");
      } else {
        const result = computeProfitBersih({
          penjualan: sales,
          produkTerjual: units,
          konversi: orders == null ? null : parseShopeeNumber(cellText(row, orders)),
          biayaIklanAsli: parseShopeeNumber(cellText(row, ads)) ?? 0,
          preset,
        });
        place(
          host,
          PROFIT,
          profitBadgeText(result.profitBersih),
          `Penjualan ${Math.round(sales).toLocaleString("id-ID")} − modal ${Math.round(result.modal).toLocaleString("id-ID")} − platform ${Math.round(result.biayaPlatform).toLocaleString("id-ID")} − iklan termasuk PPN ${Math.round(result.biayaIklanAktual).toLocaleString("id-ID")}`,
          result.profitBersih >= 0 ? "good" : "bad",
        );
      }
      const roasCell = roas == null ? null : row.cells[roas];
      const shown = parseShopeeNumber(cellText(row, roas));
      if (roasCell && shown != null) {
        if (!ready || !preset) place(roasCell, ZONE, "Perlu Setup", "Isi HPP dan harga jual di kalkulator ROAS.", "setup");
        else {
          const label = adRoasLabel(shown, preset);
          const tone = label === "Bagus" ? "good" : label === "Rugi" ? "bad" : label === "Cukup" ? "mid" : "setup";
          place(roasCell, ZONE, label, `ROAS tampilan ${shown}. Zona memakai ROAS setelah PPN topup.`, tone);
        }
      }
      stamped += 1;
    }
  }
  return stamped;
}
