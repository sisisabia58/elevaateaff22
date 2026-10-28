import { DIAGNOSIS_META, TIER_META, type ClassifiedProduct } from "./funnel";

const TIER = "ea-perf-tier";
const DIAG = "ea-perf-diag";

function badge(parent: HTMLElement, className: string, text: string, title: string, color: string) {
  let el = parent.querySelector(`:scope > .${className}`) as HTMLElement | null;
  if (!el) {
    el = document.createElement("div");
    el.className = className;
    el.style.cssText = "display:inline-block;margin:4px 4px 0 0;padding:2px 8px;border-radius:4px;color:#fff;font-size:10.5px;font-weight:700;";
    parent.appendChild(el);
  }
  el.style.background = color;
  el.textContent = text;
  el.title = title;
}

export function stampPerfCards(root: ParentNode, rows: ClassifiedProduct[]): number {
  const byId = new Map(rows.filter((row) => row.id).map((row) => [String(row.id), row]));
  let stamped = 0;
  for (const info of root.querySelectorAll(".product-item__info")) {
    if (!(info instanceof HTMLElement)) continue;
    const match = /ID Produk:\s*(\d+)/i.exec(info.textContent || "");
    const row = match ? byId.get(match[1]) : undefined;
    if (!row) continue;
    const key = `${row.tier}:${row.diagnosis}`;
    if (info.dataset.eaPerfKey === key) {
      stamped += 1;
      continue;
    }
    badge(info, TIER, TIER_META[row.tier].label, TIER_META[row.tier].desc, TIER_META[row.tier].color);
    badge(info, DIAG, DIAGNOSIS_META[row.diagnosis].label, DIAGNOSIS_META[row.diagnosis].desc, "#374151");
    info.dataset.eaPerfKey = key;
    stamped += 1;
  }
  return stamped;
}
