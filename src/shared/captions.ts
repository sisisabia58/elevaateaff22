import { formatCount, formatMoney } from "./money";
import type { Market, ScoutItem, Tone } from "./types";

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
