import { matchPreset, rowHint, type RoasPreset } from "./presets";
import { adRoasLabel, computeProfitBersih, parseShopeeNumber, profitBadgeText } from "./roas";

const PROFIT = "ea-profit-badge";
const ZONE = "ea-roas-badge";

function headerText(table: HTMLTableElement): string[] {
  return [...table.querySelectorAll("thead th")].map((header) => (header.textContent || "").replace(/\s+/g, " ").trim().toLowerCase());
}

function headerIndex(headers: string[], label: string, avoid: RegExp = /$^/): number | null {
  const exact = headers.findIndex((header) => header === label && !avoid.test(header));
  if (exact >= 0) return exact;
  const loose = headers.findIndex((header) => header.includes(label) && !avoid.test(header));
  return loose >= 0 ? loose : null;
}

function cellText(row: HTMLTableRowElement, index: number | null): string {
  if (index == null) return "";
  const cell = row.cells[index];
  if (!cell) return "";
  const clone = cell.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".ea-profit-badge,.ea-roas-badge,.ea-ad-aktual,.ea-cpc-aktual,.ea-acos-aktual").forEach((node) => node.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function aktualBadge(cell: HTMLElement, className: string, text: string, title: string) {
  let badge = cell.querySelector(`:scope > .${className}`) as HTMLElement | null;
  if (!badge) {
    badge = document.createElement("div");
    badge.className = className;
    badge.style.cssText = "margin-top:4px;display:inline-block;padding:2px 8px;border-radius:4px;background:#ee4d2d;color:#fff;font-size:11px;font-weight:700;";
    cell.appendChild(badge);
  }
  badge.textContent = text;
  badge.title = title;
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

export function stampAdTable(root: ParentNode, presets: Record<string, RoasPreset>): number {
  let stamped = 0;
  for (const table of root.querySelectorAll("table")) {
    if (!(table instanceof HTMLTableElement)) continue;
    const headers = headerText(table);
    const penjualan = headerIndex(headers, "penjualan", /voucher/);
    const sold = headerIndex(headers, "produk terjual");
    if (penjualan == null || sold == null) continue;
    const orders = headerIndex(headers, "konversi", /tingkat|biaya/);
    const ads = headerIndex(headers, "biaya iklan", /persentase|acos|per konversi/);
    const roas = headerIndex(headers, "roas");
    const cpc = headerIndex(headers, "biaya per konversi");
    const acos = headers.findIndex((header) => /acos|persentase biaya iklan/.test(header));
    for (const row of table.querySelectorAll("tbody tr")) {
      if (!(row instanceof HTMLTableRowElement)) continue;
      const sales = parseShopeeNumber(cellText(row, penjualan));
      const units = parseShopeeNumber(cellText(row, sold));
      const host = row.cells[penjualan];
      if (!host || sales == null || units == null || units <= 0) continue;
      const hint = rowHint(row, headers);
      const matched = matchPreset(presets, hint);
      const preset = matched && matched.preset.hargaJual > 0 && matched.preset.hpp > 0 ? matched.preset : null;
      const ppn = 1 + ((preset?.ppnTopupPersen ?? 11) / 100);
      if (!preset) {
        place(host, PROFIT, "Perlu Setup", "Simpan preset dengan nama yang ada di judul, atau ID produk yang sama.", "setup");
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
          `Preset ${matched?.name}. Penjualan ${Math.round(sales).toLocaleString("id-ID")} − modal ${Math.round(result.modal).toLocaleString("id-ID")} − platform ${Math.round(result.biayaPlatform).toLocaleString("id-ID")} − iklan termasuk PPN ${Math.round(result.biayaIklanAktual).toLocaleString("id-ID")}`,
          result.profitBersih >= 0 ? "good" : "bad",
        );
      }
      const roasCell = roas == null ? null : row.cells[roas];
      const shown = parseShopeeNumber(cellText(row, roas));
      if (roasCell && shown != null) {
        if (!preset) place(roasCell, ZONE, "Perlu Setup", "Simpan preset dengan nama yang ada di judul, atau ID produk yang sama.", "setup");
        else {
          const label = adRoasLabel(shown, preset);
          const tone = label === "Bagus" ? "good" : label === "Rugi" ? "bad" : label === "Cukup" ? "mid" : "setup";
          place(roasCell, ZONE, label, `Preset ${matched?.name}. ROAS tampilan ${shown}. Zona memakai ROAS setelah PPN topup.`, tone);
        }
      }
      const adCell = ads == null ? null : row.cells[ads];
      const adSpend = parseShopeeNumber(cellText(row, ads));
      if (adCell && adSpend != null && adSpend > 0) {
        aktualBadge(adCell, "ea-ad-aktual", `Ad Rp${Math.round(adSpend * ppn).toLocaleString("id-ID")}`, "Biaya Iklan Aktual = Biaya Iklan × 1,11 (termasuk PPN 11% topup saldo iklan)");
      }
      const cpcCell = cpc == null ? null : row.cells[cpc];
      const cpcValue = parseShopeeNumber(cellText(row, cpc));
      if (cpcCell && cpcValue != null && cpcValue > 0) {
        aktualBadge(cpcCell, "ea-cpc-aktual", `BpK Rp${Math.round(cpcValue * ppn).toLocaleString("id-ID")}`, "Biaya per Konversi Aktual = Biaya per Konversi × 1,11");
      }
      const acosCell = acos < 0 ? null : row.cells[acos];
      const acosValue = parseShopeeNumber(cellText(row, acos < 0 ? null : acos));
      if (acosCell && acosValue != null) {
        aktualBadge(acosCell, "ea-acos-aktual", `ACOS Aktual ${(acosValue * ppn).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, "ACOS Aktual = ACOS × 1,11");
      }
      stamped += 1;
    }
  }
  return stamped;
}
