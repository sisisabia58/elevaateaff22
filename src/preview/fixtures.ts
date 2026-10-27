import type { ScoutItem } from "../shared/types";

const origin = "https://shopee.co.id";

export const FIXTURES: ScoutItem[] = [
  ["Tumbler Stainless 600ml Tutup Sedotan", 89000, 1240, 4.8, "Dapur Kecil", false],
  ["Botol Minum Kaca 450ml Sleeve Silikon", 67000, 860, 4.7, "Rumah Minum", false],
  ["Set Sedotan Stainless 4 pcs + Sikat", 29000, 4300, 4.9, "Dapur Kecil", true],
  ["Lunch Box 2 Sekat Anti Bocor", 112000, 540, 4.6, "Bekal Hemat", false],
  ["Talenan Kayu Akasia 30cm", 154000, 210, 4.5, "Meja Masak", false],
  ["Cangkir Kopi Keramik 250ml", 48000, 90, 4.4, "Pagi House", false],
].map(([name, price, sold, rating, shopName, isAd], index) => ({
  itemId: String(2000 + index),
  shopId: "88001",
  name: String(name),
  price: Number(price),
  sold: Number(sold),
  rating: Number(rating),
  image: null,
  shopName: String(shopName),
  isAd: Boolean(isAd),
  url: `${origin}/product/88001/${2000 + index}`,
}));

export const FEATURED = FIXTURES[0];
