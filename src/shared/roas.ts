export type RoasInput = {
  hargaJual: number;
  hpp: number;
  operasional?: number;
  biayaAdministrasiPersen?: number;
  biayaProsesPesanan?: number;
  ongkirXtraPersen?: number;
  biayaLayananPersen?: number;
  biayaLainnyaPersen?: number;
  komisiAffiliatePersen?: number;
  budgetDivisor?: number;
  ppnTopupPersen?: number;
};

export const EMPTY_ROAS: RoasInput = { hargaJual: 100000, hpp: 40000, komisiAffiliatePersen: 0 };

export type RoasResult = {
  totalBiayaPerPesanan: number;
  marginKontribusi: number;
  marginKontribusiPersen: number;
  adSpendMax: number;
  targetROAS: number | null;
  breakEvenROAS: number | null;
  valid: boolean;
};

export type RoasTier = { key: string; label: string; budgetDivisor: number; targetROAS: number | null; valid: boolean };

export const ROAS_TIERS: Array<{ key: string; label: string; budgetDivisor: number }> = [
  { key: "rugi", label: "Rugi", budgetDivisor: 1 },
  { key: "kompetitif", label: "Kompetitif", budgetDivisor: 1.5 },
  { key: "konservatif", label: "Konservatif", budgetDivisor: 2.5 },
  { key: "prospektif", label: "Prospektif", budgetDivisor: 5 },
];

export function hitungTargetROAS(input: RoasInput): RoasResult {
  const hargaJual = input.hargaJual;
  const hpp = input.hpp;
  const operasional = input.operasional ?? 0;
  const biayaAdministrasi = (hargaJual * (input.biayaAdministrasiPersen ?? 0)) / 100;
  const biayaProsesPesanan = input.biayaProsesPesanan ?? 0;
  const biayaOngkirXtra = (hargaJual * (input.ongkirXtraPersen ?? 0)) / 100;
  const biayaLayanan = (hargaJual * (input.biayaLayananPersen ?? 0)) / 100;
  const biayaLainnya = (hargaJual * (input.biayaLainnyaPersen ?? 0)) / 100;
  const komisiAffiliate = (hargaJual * (input.komisiAffiliatePersen ?? 0)) / 100;
  const totalBiayaPerPesanan = biayaAdministrasi + biayaProsesPesanan + biayaOngkirXtra + biayaLayanan + biayaLainnya + komisiAffiliate;
  const marginKontribusi = hargaJual - hpp - operasional - totalBiayaPerPesanan;
  const divisor = input.budgetDivisor && input.budgetDivisor > 0 ? input.budgetDivisor : 1;
  const ppn = input.ppnTopupPersen ?? 11;
  const budgetIklanNet = marginKontribusi / divisor;
  const adSpendMax = budgetIklanNet / (1 + ppn / 100);
  const adSpendBep = marginKontribusi / (1 + ppn / 100);
  return {
    totalBiayaPerPesanan,
    marginKontribusi,
    marginKontribusiPersen: hargaJual > 0 ? (marginKontribusi / hargaJual) * 100 : 0,
    adSpendMax,
    targetROAS: adSpendMax > 0 ? hargaJual / adSpendMax : null,
    breakEvenROAS: adSpendBep > 0 ? hargaJual / adSpendBep : null,
    valid: marginKontribusi > 0 && budgetIklanNet > 0,
  };
}

export function hitungMultiTierROAS(input: RoasInput): RoasTier[] {
  return ROAS_TIERS.map((tier) => {
    const hasil = hitungTargetROAS({ ...input, budgetDivisor: tier.budgetDivisor });
    return { ...tier, targetROAS: hasil.targetROAS, valid: hasil.valid };
  });
}

export function zoneFor(actualRoas: number | null, tiers: RoasTier[]): RoasTier | null {
  if (actualRoas === null || Number.isNaN(actualRoas)) return null;
  const valid = tiers.filter((tier) => tier.valid && tier.targetROAS !== null);
  if (!valid.length) return null;
  for (const tier of valid) {
    if (actualRoas <= (tier.targetROAS as number)) return tier;
  }
  return valid[valid.length - 1];
}

export type FunnelTier = "star" | "cashcow" | "question" | "dog";

export function classifyTier(sold: number, growthPct: number, medianSold: number, medianGrowth: number): FunnelTier {
  const highSold = sold >= medianSold;
  const highGrowth = growthPct >= medianGrowth;
  if (highSold && highGrowth) return "star";
  if (highSold) return "cashcow";
  if (highGrowth) return "question";
  return "dog";
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function realProfit(input: { price: number; fees: number; hpp: number; ads: number }): number {
  return input.price - input.fees - input.hpp - input.ads;
}
