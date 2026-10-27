import { DEFAULT_SETTINGS, type Settings, type Tone } from "./types";

const TONES: Tone[] = ["santai", "singkat", "cerita"];

export function normalizeSettings(value: unknown): Settings {
  const raw = value !== null && typeof value === "object" ? (value as Partial<Settings>) : {};
  const rate = typeof raw.defaultRatePct === "number" ? raw.defaultRatePct : DEFAULT_SETTINGS.defaultRatePct;
  const tone = TONES.includes(raw.tone as Tone) ? (raw.tone as Tone) : DEFAULT_SETTINGS.tone;
  return {
    defaultRatePct: Math.min(60, Math.max(0.5, Math.round(rate * 10) / 10)),
    tone,
    showScout: typeof raw.showScout === "boolean" ? raw.showScout : DEFAULT_SETTINGS.showScout,
  };
}

const KEY = "ea-settings";

function chromeStorage(): chrome.storage.LocalStorageArea | null {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  } catch {
    /* not an extension page */
  }
  return null;
}

export async function loadSettings(): Promise<Settings> {
  const local = chromeStorage();
  if (local) {
    const bag = await local.get(KEY);
    return normalizeSettings(bag[KEY]);
  }
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return normalizeSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const next = normalizeSettings(settings);
  const local = chromeStorage();
  if (local) {
    await local.set({ [KEY]: next });
    return;
  }
  globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
}
