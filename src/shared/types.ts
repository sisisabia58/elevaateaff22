export type Tone = "santai" | "singkat" | "cerita";

export type Settings = {
  defaultRatePct: number;
  tone: Tone;
  showScout: boolean;
};

export type Market = {
  code: "IDR" | "MYR";
  symbol: string;
  locale: string;
};

export type PageKind = "product" | "search" | "shop" | "other";

export type ScoutItem = {
  itemId: string;
  shopId: string;
  name: string;
  price: number;
  sold: number | null;
  rating: number | null;
  image: string | null;
  shopName: string | null;
  isAd: boolean;
  url: string;
};

export type LiveCommission = {
  ratePct: number;
  amount: number;
  xtraRatePct: number | null;
  promotedLast7d: number | null;
  freeSample: boolean | null;
};

export type CommissionView = {
  source: "live" | "estimate";
  ratePct: number;
  amount: number;
  note: string;
  xtraRatePct: number | null;
  promotedLast7d: number | null;
  freeSample: boolean | null;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultRatePct: 8,
  tone: "santai",
  showScout: true,
};

export const SOURCE = "elevate-affiliate";
