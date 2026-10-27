import type { AuthSession } from "./auth";
import { isSessionValid, loadSession, serverErrorHint } from "./auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-config";

const lastPing: Record<string, number> = {};

function headers(session: AuthSession, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function requireSession(): Promise<AuthSession | { error: string }> {
  const session = await loadSession();
  if (!isSessionValid(session) || !session.userId) return { error: serverErrorHint("Login Google tim dulu di pengaturan.") };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { error: "supabase-config.ts belum diisi." };
  return session;
}

export async function callAiProxy(
  feature: string,
  payload: Record<string, unknown>,
  apiKey: string,
  model: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!apiKey.trim()) return { ok: false, error: "API key Gemini belum diisi di pengaturan." };
  const session = await requireSession();
  if ("error" in session) return { ok: false, error: session.error };
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: headers(session),
      body: JSON.stringify({ feature, geminiApiKey: apiKey, model, ...payload }),
    });
    const json = (await response.json().catch(() => null)) as { ok?: boolean; text?: string; error?: string } | null;
    if (!response.ok || json?.ok === false) return { ok: false, error: serverErrorHint(json?.error || "Gagal memproses lewat Gemini API.") };
    if (!json?.text) return { ok: false, error: "Gemini tidak mengembalikan hasil. Coba lagi." };
    return { ok: true, text: json.text };
  } catch {
    return { ok: false, error: "Gagal menghubungi server. Cek koneksi internet." };
  }
}

export async function callFeatureProxy(
  feature: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const session = await requireSession();
  if ("error" in session) return { ok: false, error: session.error };
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/feature-proxy`, {
      method: "POST",
      headers: headers(session),
      body: JSON.stringify({ feature, ...payload }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) return { ok: false, error: serverErrorHint(json?.error || "Fungsi server menolak permintaan.") };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "Gagal menghubungi server. Cek koneksi internet." };
  }
}

export async function pingFeature(feature: string): Promise<void> {
  const now = Date.now();
  if (lastPing[feature] && now - lastPing[feature] < 900_000) return;
  const session = await requireSession();
  if ("error" in session) return;
  lastPing[feature] = now;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/feature_usage_log`, {
      method: "POST",
      headers: headers(session, { Prefer: "return=minimal" }),
      body: JSON.stringify({ user_id: session.userId, feature }),
    });
  } catch {
    /* usage log is best-effort */
  }
}

export async function pushBackup(field: "hpp" | "roas_presets", value: unknown): Promise<void> {
  const session = await requireSession();
  if ("error" in session) return;
  await fetch(`${SUPABASE_URL}/rest/v1/user_backups?on_conflict=user_id`, {
    method: "POST",
    headers: headers(session, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ user_id: session.userId, [field]: value, updated_at: new Date().toISOString() }),
  });
}

export async function reportShopeeAccount(input: {
  shopeeUserId: string;
  username: string | null;
  shopId: string | null;
  isSeller: boolean;
}): Promise<void> {
  const session = await requireSession();
  if ("error" in session) return;
  await fetch(`${SUPABASE_URL}/rest/v1/shopee_account_links?on_conflict=user_id,shopee_user_id`, {
    method: "POST",
    headers: headers(session, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([
      {
        user_id: session.userId,
        shopee_user_id: input.shopeeUserId,
        shopee_username: input.username,
        shop_id: input.shopId,
        is_seller: input.isSeller,
      },
    ]),
  });
}

export type SavedContact = { affiliateId: string; name: string; phone: string | null; email: string | null };

export async function saveContacts(rows: SavedContact[]): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const session = await requireSession();
  if ("error" in session) return { ok: false, error: session.error };
  const body = rows.map((row) => ({
    user_id: session.userId,
    affiliate_id: row.affiliateId,
    phone: row.phone,
    email: row.email,
    updated_at: new Date().toISOString(),
  }));
  const response = await fetch(`${SUPABASE_URL}/rest/v1/affiliate_contacts_unlocked?on_conflict=user_id,affiliate_id`, {
    method: "POST",
    headers: headers(session, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) return { ok: false, error: serverErrorHint("Gagal menyimpan kontak. Cek izin tabel di Supabase.") };
  return { ok: true, count: rows.length };
}

export async function countSavedContacts(): Promise<number | null> {
  const session = await requireSession();
  if ("error" in session) return null;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/affiliate_contacts_unlocked?user_id=eq.${encodeURIComponent(session.userId || "")}&select=affiliate_id`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.accessToken}` } },
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as unknown[];
  return rows.length;
}
