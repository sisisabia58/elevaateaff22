import type { RoasInput } from "./roas";

export type RoasPreset = RoasInput & { productId?: string };

const BADGES = ".ea-profit-badge,.ea-roas-badge,.ea-ad-aktual,.ea-cpc-aktual,.ea-acos-aktual,.ea-profit-summary,.ea-strip-aktual";

export function normalizePresetText(text: string): string {
  return text.toLowerCase().replace(/×/g, "x").replace(/\s+/g, " ").trim();
}

export function matchPreset(
  presets: Record<string, RoasPreset>,
  hint: { title?: string | null; productId?: string | null },
): { name: string; preset: RoasPreset } | null {
  const productId = hint.productId ? String(hint.productId) : "";
  if (productId) {
    for (const [name, preset] of Object.entries(presets)) {
      if (preset?.productId && String(preset.productId) === productId) return { name, preset };
    }
  }
  const title = normalizePresetText(hint.title || "");
  for (const [name, preset] of Object.entries(presets)) {
    const key = normalizePresetText(name);
    if (key.length >= 5 && title.includes(key)) return { name, preset };
  }
  return null;
}

export function visibleText(node: Element | null | undefined): string {
  if (!node) return "";
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(BADGES).forEach((badge) => badge.remove());
  return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

export function rowHint(row: HTMLTableRowElement, headers: string[]): { title: string; productId: string | null } {
  const productIndex = headers.findIndex((header) => header === "produk");
  const cell = productIndex >= 0 ? row.cells[productIndex] : row.cells[0];
  const title = visibleText(cell);
  const blob = visibleText(row);
  const link = row.querySelector('a[href*="/product/manual/"]')?.getAttribute("href") || "";
  const fromLink = link.match(/\/product\/manual(?:-[a-z0-9]+)?\/(\d+)/i);
  const fromText = blob.match(/ID Produk:\s*(\d+)/i);
  return { title, productId: fromLink?.[1] ?? fromText?.[1] ?? null };
}
