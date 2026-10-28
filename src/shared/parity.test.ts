import { describe, expect, it } from "vitest";
import { priceHistogram, shopSummary } from "./research";
import { detectExportKind, parseCsv, parseHppCsv, parseTable, snapshot } from "./reports";
import { adRoasLabel, classifyTier, computeProfitBersih, hitungMultiTierROAS, hitungTargetROAS, median, parseShopeeNumber, profitBadgeText, realProfit, zoneFor } from "./roas";
import type { ScoutItem } from "./types";

const item = (partial: Partial<ScoutItem> & Pick<ScoutItem, "itemId" | "price" | "sold">): ScoutItem => ({
  shopId: "1",
  name: partial.itemId,
  rating: null,
  image: null,
  shopName: null,
  isAd: false,
  url: "https://shopee.co.id/product/1/" + partial.itemId,
  ...partial,
});

describe("roas", () => {
  it("puts break-even above 1x after 11% ad tax", () => {
    const hasil = hitungTargetROAS({ hargaJual: 100000, hpp: 40000 });
    expect(hasil.valid).toBe(true);
    expect(hasil.targetROAS).toBeCloseTo(1.85, 2);
    const tiers = hitungMultiTierROAS({ hargaJual: 100000, hpp: 40000 });
    expect(tiers.map((tier) => tier.key)).toEqual(["rugi", "kompetitif", "konservatif", "prospektif"]);
    expect(tiers[3].targetROAS! > tiers[0].targetROAS!).toBe(true);
    expect(zoneFor(1.2, tiers)?.key).toBe("rugi");
    expect(zoneFor(10, tiers)?.key).toBe("prospektif");
  });

  it("classifies a catalog around the median", () => {
    const sold = [10, 50, 80];
    const growth = [5, -2, 20];
    expect(classifyTier(80, 20, median(sold), median(growth))).toBe("star");
    expect(classifyTier(10, -2, median(sold), median(growth))).toBe("dog");
  });

  it("subtracts fees, hpp, and ads from price", () => {
    expect(realProfit({ price: 100, fees: 10, hpp: 40, ads: 5 })).toBe(45);
  });

  it("prices a row after the 11% ad top-up and names the zone", () => {
    expect(parseShopeeNumber("Rp890.000")).toBe(890000);
    expect(parseShopeeNumber("16,00")).toBe(16);
    const result = computeProfitBersih({
      penjualan: 890_000,
      produkTerjual: 10,
      konversi: 8,
      biayaIklanAsli: 50_000,
      preset: { hargaJual: 100_000, hpp: 40_000 },
    });
    expect(result.modal).toBe(400_000);
    expect(result.biayaIklanAktual).toBeCloseTo(55_500, 5);
    expect(result.profitBersih).toBeCloseTo(434_500, 5);
    expect(profitBadgeText(result.profitBersih)).toBe("Profit Rp434.500");
    expect(adRoasLabel(16, { hargaJual: 100_000, hpp: 40_000 })).toBe("Bagus");
    expect(adRoasLabel(1.5, { hargaJual: 100_000, hpp: 40_000 })).toBe("Rugi");
  });
});

describe("research summary", () => {
  const items = [item({ itemId: "a", price: 10000, sold: 10 }), item({ itemId: "b", price: 30000, sold: 70 }), item({ itemId: "c", price: 20000, sold: 20 })];

  it("reports price spread and top-three sold share", () => {
    const summary = shopSummary(items);
    expect(summary).toMatchObject({ count: 3, minPrice: 10000, maxPrice: 30000 });
    expect(summary?.top3SharePct).toBe(100);
  });

  it("buckets prices", () => {
    const buckets = priceHistogram(items, 2);
    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(3);
  });
});

describe("shopee exports", () => {
  it("detects the three report types and computes profit", () => {
    expect(detectExportKind(["No. Pesanan", "Harga Produk", "Jumlah"])).toBe("pesanan");
    expect(detectExportKind(["No. Pesanan", "Total Penghasilan", "Biaya Administrasi"])).toBe("keuangan");
    expect(detectExportKind(["Nama Iklan", "Biaya", "Omzet Penjualan"])).toBe("iklan");
    const orders = parseTable(
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Ongkir dibayar pembeli", "Ongkir ke kurir", "Status Pesanan"],
      [["A1", "SKU1", "Tumbler", "2", "80000", "5000", "12000", "Selesai"], ["A2", "SKU1", "Tumbler", "1", "40000", "0", "0", "Batal"]],
    );
    const finance = parseTable(["No. Pesanan", "Harga Produk", "Total Penghasilan", "Biaya Administrasi", "Biaya Layanan"], [["A1", "80000", "70000", "4000", "1000"]]);
    const ads = parseTable(["Nama Iklan", "Biaya", "Omzet Penjualan", "Produk Terjual"], [["Tumbler", "10000", "40000", "2"]]);
    const result = snapshot({
      orders: orders.orders,
      finance: finance.finance,
      ads: ads.ads,
      hppBySku: { SKU1: 15000 },
      claimed: [],
    });
    expect(result.orders).toBe(1);
    expect(result.cancelled).toBe(1);
    expect(result.hpp).toBe(30000);
    expect(result.profit).toBe(70000 - 5000 - 30000 - 10000);
    expect(result.shortfalls[0]).toMatchObject({ orderNo: "A1", amount: 7000 });
    expect(result.roas).toBe(4);
    expect(parseHppCsv("sku,varian,hpp\nSKU1,Merah,15000")).toEqual({ "SKU1|Merah": 15000 });
  });

  it("parses a csv row with quotes", () => {
    const parsed = parseCsv('Nama,Harga\n"Tumbler, besar",89000\n');
    expect(parsed.rows[0][0]).toBe("Tumbler, besar");
  });
});
