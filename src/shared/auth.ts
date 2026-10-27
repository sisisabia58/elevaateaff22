import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
  email?: string;
};

const KEY = "ea-auth";

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isSessionValid(session: AuthSession | null): session is AuthSession {
  return Boolean(session?.accessToken && session.expiresAt && session.expiresAt - 30_000 > Date.now());
}

function localStore(): chrome.storage.LocalStorageArea | null {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) return chrome.storage.local;
  } catch {
    /* preview */
  }
  return null;
}

export async function loadSession(): Promise<AuthSession | null> {
  const local = localStore();
  if (local) {
    const bag = await local.get(KEY);
    return (bag[KEY] as AuthSession | undefined) ?? null;
  }
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  const local = localStore();
  if (local) {
    await local.set({ [KEY]: session });
    return;
  }
  globalThis.localStorage?.setItem(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  const local = localStore();
  if (local) {
    await local.remove(KEY);
    return;
  }
  globalThis.localStorage?.removeItem(KEY);
}

export async function attachUser(accessToken: string): Promise<void> {
  if (!supabaseConfigured()) return;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return;
  const user = (await response.json()) as { id?: string; email?: string };
  const session = await loadSession();
  if (!session) return;
  await saveSession({ ...session, userId: user.id, email: user.email });
}

export async function refreshSession(): Promise<AuthSession | null> {
  const session = await loadSession();
  if (!session?.refreshToken || !supabaseConfigured()) return session;
  if (session.expiresAt - 600_000 > Date.now()) return session;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!response.ok) {
    if (response.status === 400) await clearSession();
    return null;
  }
  const data = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  const next: AuthSession = {
    ...session,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: Date.now() + 1000 * (data.expires_in || 3600),
  };
  await saveSession(next);
  return next;
}

export async function signInWithGoogle(): Promise<AuthSession> {
  if (!supabaseConfigured()) throw new Error("Salin supabase-config.example.ts menjadi supabase-config.ts dan isi URL plus anon key.");
  if (typeof chrome === "undefined" || !chrome.identity?.launchWebAuthFlow) {
    throw new Error("Login Google hanya jalan di dalam extension.");
  }
  const redirectTo = chrome.identity.getRedirectURL();
  const authorizeUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
  const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authorizeUrl, interactive: true });
  if (!responseUrl) throw new Error("Login dibatalkan.");
  const url = new URL(responseUrl);
  const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
  const errorDesc = frag.get("error_description") || url.searchParams.get("error_description");
  if (errorDesc) throw new Error(errorDesc);
  const accessToken = frag.get("access_token");
  const refreshToken = frag.get("refresh_token");
  if (!accessToken || !refreshToken) throw new Error("Gagal dapat sesi login dari Supabase.");
  const session: AuthSession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + 1000 * Number(frag.get("expires_in") || 3600),
  };
  await saveSession(session);
  await attachUser(accessToken);
  return (await loadSession()) ?? session;
}

export async function signOut(): Promise<void> {
  const session = await loadSession();
  if (session?.accessToken && supabaseConfigured()) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      /* local sign-out still proceeds */
    }
  }
  await clearSession();
}

export function serverErrorHint(message: string): string {
  if (/subscription|langganan|jwt|auth/i.test(message)) {
    return `${message} Kalau penyebabnya baris langganan, set subscriptions.status = active untuk user ini di dashboard Supabase. Elevate tidak membuka halaman bayar.`;
  }
  return message;
}
