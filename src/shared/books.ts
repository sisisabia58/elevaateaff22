import { loadSession } from "./auth";
import type { AdRow, FinanceRow, OrderRow } from "./reports";
import { pushBackup } from "./server";
import type { RoasPreset } from "./presets";
import { EMPTY_ROAS, type RoasInput } from "./roas";

export type Books = {
  orders: OrderRow[];
  finance: FinanceRow[];
  ads: AdRow[];
  claimed: string[];
  hpp: Record<string, number>;
  roas: RoasInput;
  presets: Record<string, RoasPreset>;
};

export const EMPTY_BOOKS: Books = {
  orders: [],
  finance: [],
  ads: [],
  claimed: [],
  hpp: {},
  roas: EMPTY_ROAS,
  presets: {},
};

const DB = "elevate-affiliate";
const STORE = "books";

async function ownerKey(): Promise<string> {
  const session = await loadSession();
  return session?.userId || "local";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<Books | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as Books | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: Books): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function localKey(key: string) {
  return `ea-books:${key}`;
}

export async function loadBooks(): Promise<Books> {
  const key = await ownerKey();
  try {
    const stored = await idbGet(key);
    if (stored) return { ...EMPTY_BOOKS, ...stored, roas: { ...EMPTY_ROAS, ...stored.roas }, hpp: stored.hpp || {}, presets: stored.presets || {} };
  } catch {
    /* IndexedDB unavailable */
  }
  try {
    const raw = localStorage.getItem(localKey(key));
    if (!raw) return { ...EMPTY_BOOKS, hpp: {}, claimed: [] };
    const parsed = JSON.parse(raw) as Books;
    return { ...EMPTY_BOOKS, ...parsed, roas: { ...EMPTY_ROAS, ...parsed.roas }, presets: parsed.presets || {} };
  } catch {
    return { ...EMPTY_BOOKS, hpp: {}, claimed: [] };
  }
}

export async function saveBooks(books: Books): Promise<void> {
  const key = await ownerKey();
  try {
    await idbSet(key, books);
  } catch {
    localStorage.setItem(localKey(key), JSON.stringify(books));
  }
  const session = await loadSession();
  if (!session?.userId) return;
  try {
    await pushBackup("hpp", books.hpp);
    await pushBackup("roas_presets", books.presets);
  } catch {
    /* backup is best-effort */
  }
}
