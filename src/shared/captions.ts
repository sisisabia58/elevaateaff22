import { formatCount, formatMoney } from "./money";
import type { Market, ScoutItem, Tone } from "./types";

export const THREAD_PART_DELIM = "===PART===";

const BUY_NOW_RE = /^(beli|buy now)\b/i;
const ADD_TO_CART_RE = /^(masukkan keranjang|add to cart|tambah dalam troli)$/i;

export type AiPanel = {
  title: string;
  body: string;
  parts?: string[];
  owner?: "Toko Anda" | null;
  ai?: boolean;
};

export type AiItemInfo = {
  name: string | null;
  price: number | null;
  totalSold: number | null;
  sold30d: number | null;
  stock: number | null;
  wishlist: number | null;
  ratingStar: number | null;
  ratingCount: number | null;
  models: Array<{ name: string; price: number | null }>;
  shopName: string | null;
  ctime: number | null;
  image: string | null;
  images: string[];
};

export function parseThreadParts(text: string): string[] {
  return String(text || "")
    .split(new RegExp(`\\n?\\s*${THREAD_PART_DELIM}\\s*\\n?`, "g"))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function hasBuyNow(labels: string[]): boolean {
  return labels.some((label) => BUY_NOW_RE.test(label.trim()));
}

export function hasAddToCart(labels: string[]): boolean {
  return labels.some((label) => ADD_TO_CART_RE.test(label.trim()));
}

export function isOwnShop(labels: string[]): boolean {
  return !hasBuyNow(labels) && !hasAddToCart(labels);
}

export function buttonLabels(root: ParentNode): string[] {
  return [...root.querySelectorAll("button")].map((button) => (button.textContent || "").trim());
}

export function aiItemInfo(item: ScoutItem): AiItemInfo {
  return {
    name: item.name || null,
    price: item.price,
    totalSold: item.sold,
    sold30d: item.monthlySold ?? null,
    stock: item.stock ?? null,
    wishlist: item.wishlist ?? null,
    ratingStar: item.rating,
    ratingCount: item.ratingCount ?? null,
    models: (item.models ?? []).map((model) => ({ name: model.name, price: null })),
    shopName: item.shopName,
    ctime: item.ctime ?? null,
    image: item.image,
    images: item.images ?? [],
  };
}

export function reviewFeature(labels: string[]): "own_shop_review" | "competitor_review" {
  return isOwnShop(labels) ? "own_shop_review" : "competitor_review";
}

export type Caption = { id: Tone; label: string; text: string };

const LABELS: Record<Tone, string> = {
  santai: "Santai",
  singkat: "Singkat",
  cerita: "Cerita",
};

function ratingText(item: ScoutItem): string | null {
  if (item.rating === null || item.rating <= 0) return null;
  return `${item.rating.toFixed(1)}★`;
}

export const THREAD_ANGLES = [
  { key: "problem_solution", label: "Problem → Solusi" },
  { key: "testimoni", label: "Cerita Pribadi / Testimoni" },
  { key: "rekomendasi_terselubung", label: "Rekomendasi Terselubung" },
  { key: "listicle", label: "Listicle" },
  { key: "trivia", label: "Fakta Menarik / Trivia" },
] as const;

export type ThreadAngle = (typeof THREAD_ANGLES)[number]["key"];

export function localThread(item: ScoutItem, market: Market, angle: ThreadAngle): string {
  const price = formatMoney(item.price, market);
  const sold = item.sold && item.sold > 0 ? `${formatCount(item.sold)} orang sudah checkout` : "baru naik di pencarian";
  const stars = ratingText(item);
  const shop = item.shopName ? ` dari ${item.shopName}` : "";
  if (angle === "problem_solution") {
    return `Sebelum checkout, yang sering bikin ragu adalah harga dan varian yang tidak kebaca. ${item.name}${shop} ada di ${price}. ${sold}. Linknya di sini buat cek detailnya.`;
  }
  if (angle === "testimoni") {
    return `Aku pakai ${item.name} beberapa hari. Harganya ${price}${stars ? `, rating pembeli ${stars}` : ""}, dan yang bikin stay adalah detailnya kebaca di halaman produk. ${sold}.`;
  }
  if (angle === "rekomendasi_terselubung") {
    return `Kalau lagi susun daftar belanja, ${item.name} sering muncul di hasil yang sama. ${price}${shop}. Bukan satu-satunya pilihan, tapi ${sold}, jadi angkanya sempat aku cek.`;
  }
  if (angle === "listicle") {
    return `Tiga hal yang aku lihat sebelum simpan ${item.name}: harga ${price}, ${sold}, dan ${stars ? `rating ${stars}` : "ulasan di halaman produk"}. Variannya ada di link yang sama.`;
  }
  return `${item.name} lagi dicari orang yang bandingkan harga di kisaran ${price}. ${sold}${shop}. Fakta yang keliatan di halaman: ${stars ? `rating ${stars}` : "jumlah terjual dan varian"}.`;
}

export function buildCaptions(item: ScoutItem, market: Market, preferred: Tone): Caption[] {
  const price = formatMoney(item.price, market);
  const sold = item.sold && item.sold > 0 ? `${formatCount(item.sold)} terjual` : null;
  const stars = ratingText(item);
  const all: Caption[] = [
    {
      id: "santai",
      label: LABELS.santai,
      text: `Lagi lihat-lihat ${item.name}? Harganya ${price}${sold ? `, sudah ${sold}` : ""}. Cek varian dan detailnya di link ini.`,
    },
    {
      id: "singkat",
      label: LABELS.singkat,
      text: `${item.name} — ${price}${sold ? ` · ${sold}` : ""}. Link produknya di sini.`,
    },
    {
      id: "cerita",
      label: LABELS.cerita,
      text: `Aku bandingkan beberapa listing sebelum menetap di ${item.name}. Harganya ${price}${stars ? ` dan ratingnya ${stars}` : ""}, cukup jelas buat dicoba. Kalau kamu cari yang sejenis, ini linknya.`,
    },
  ];
  return [all.find((caption) => caption.id === preferred)!, ...all.filter((caption) => caption.id !== preferred)];
}
