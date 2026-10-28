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

const PRESET_NUMBERS = [
  "hargaJual",
  "hpp",
  "operasional",
  "biayaAdministrasiPersen",
  "biayaProsesPesanan",
  "ongkirXtraPersen",
  "biayaLayananPersen",
  "biayaLainnyaPersen",
  "komisiAffiliatePersen",
  "budgetDivisor",
  "ppnTopupPersen",
] as const;

export function presetBackup(presets: Record<string, RoasPreset>, exportedAt = new Date().toISOString()) {
  return { _backupVersion: 1, _exportedAt: exportedAt, type: "sena-roas-presets", presets };
}

export function presetBackupFilename(day = new Date().toISOString().slice(0, 10)): string {
  return `sena-roas-presets-${day}.json`;
}

export function importConfirmMessage(total: number, collisions: string[]): string {
  return collisions.length
    ? `File ini isinya ${total} preset (${collisions.length} nama bentrok sama preset yang udah ada dan bakal ketimpa). Lanjutkan import?`
    : `Import ${total} preset dari file ini?`;
}

export function normalizeImportedPreset(value: unknown): RoasPreset | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const hargaJual = Number(raw.hargaJual);
  const hpp = Number(raw.hpp);
  if (!Number.isFinite(hargaJual) || !Number.isFinite(hpp)) return null;
  const preset: RoasPreset = { hargaJual, hpp };
  for (const key of PRESET_NUMBERS) {
    if (key === "hargaJual" || key === "hpp") continue;
    if (raw[key] == null || raw[key] === "") continue;
    const num = Number(raw[key]);
    if (Number.isFinite(num)) preset[key] = num;
  }
  if (typeof raw.productId === "string" && raw.productId.trim()) preset.productId = raw.productId.trim();
  return preset;
}

export function parsePresetBackup(text: string): { ok: true; presets: Record<string, RoasPreset> } | { ok: false; error: string } {
  let backup: unknown;
  try {
    backup = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "JSON tidak terbaca.";
    return { ok: false, error: `Gagal import preset: ${message}` };
  }
  const incoming = backup && typeof backup === "object" ? (backup as { presets?: unknown }).presets : null;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return { ok: false, error: "File ini bukan file export preset ROAS yang valid." };
  }
  const entries = Object.entries(incoming);
  if (!entries.length) return { ok: false, error: "File export ini kosong, gak ada preset di dalamnya." };
  const presets: Record<string, RoasPreset> = {};
  for (const [name, value] of entries) {
    const preset = normalizeImportedPreset(value);
    if (preset && name.trim()) presets[name] = preset;
  }
  if (!Object.keys(presets).length) return { ok: false, error: "File ini bukan file export preset ROAS yang valid." };
  return { ok: true, presets };
}

export function mergePresets(
  existing: Record<string, RoasPreset>,
  incoming: Record<string, RoasPreset>,
): { merged: Record<string, RoasPreset>; collisions: string[] } {
  const collisions = Object.keys(incoming).filter((name) => existing[name]);
  return { merged: { ...existing, ...incoming }, collisions };
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
