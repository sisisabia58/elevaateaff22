import type { ScoutItem } from "../shared/types";

const origin = "https://shopee.co.id";
const day = 86400;
const now = Math.floor(Date.now() / 1000);

const rows: Array<[string, number, number, number, string, boolean, number, number, number, number, boolean | null, string | null]> = [
  ["Tumbler Stainless 600ml Tutup Sedotan", 89000, 1240, 4.8, "Dapur Kecil", false, 180, 120, 320, 50, false, null],
  ["Botol Minum Kaca 450ml Sleeve Silikon", 67000, 860, 4.7, "Rumah Minum", false, 40, 200, 80, 12, false, null],
  ["Set Sedotan Stainless 4 pcs + Sikat", 29000, 4300, 4.9, "Dapur Kecil", true, 900, 90, 900, 210, false, "sedotan stainless"],
  ["Lunch Box 2 Sekat Anti Bocor", 112000, 540, 4.6, "Bekal Hemat", false, 70, 80, 40, 8, false, null],
  ["Talenan Kayu Akasia 30cm", 154000, 210, 4.5, "Meja Masak", false, 8, 400, 12, 4, true, null],
  ["Cangkir Kopi Keramik 250ml", 48000, 90, 4.4, "Pagi House", false, 12, 75, 3, 1, null, null],
];

export const FIXTURES: ScoutItem[] = rows.map(
  ([name, price, sold, rating, shopName, isAd, monthlySold, ageDays, ratingCount, wishlist, soldOut, adKeyword], index) => ({
    itemId: String(2000 + index),
    shopId: String(88001 + (index % 3)),
    name,
    price,
    sold,
    rating,
    image: null,
    shopName,
    isAd,
    url: `${origin}/product/88001/${2000 + index}`,
    monthlySold,
    ctime: now - ageDays * day,
    ratingCount,
    wishlist,
    soldOut,
    adKeyword,
    adMode: isAd ? "2" : null,
    shopCtime: now - [40, 120, 200, 500, 900, 2000][index] * day,
    models:
      index === 0
        ? [
            { name: "Hitam", images: ["https://down-id.img.susercontent.com/hitam"] },
            { name: "Putih", images: ["https://down-id.img.susercontent.com/putih"] },
          ]
        : undefined,
  }),
);

export const FEATURED = FIXTURES[0];
