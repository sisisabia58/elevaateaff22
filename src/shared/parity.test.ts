import { describe, expect, it } from "vitest";
import { parsePerformance, priceHistogram, shopSummary } from "./research";
import { adCampaigns, adChartLabel, adFraction, adGapNote, adSignal, clipAdName, dateBasisWarning, demoProfitSnapshot, detectExportKind, hppLines, hppMaster, listPeriods, listStores, mergeStoreRows, monthWindow, parseCsv, parseExportGrid, parseHppCsv, parseTable, periodLabel, profitCharts, shippingClass, skuDisplayLabel, snapshot, studioLedger, toggleStore } from "./reports";
import { perfExtras } from "./perf-metrics";
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

  it("derives actual ad cost, ACOS, CPC, and RPM from the metric strip", () => {
    const extras = perfExtras({ sales: 1_000_000, adSpend: 100_000, impressions: 10_000, clicks: 500, orders: 25 });
    expect(extras?.adSpendActual).toBeCloseTo(111_000, 5);
    expect(extras?.roasActual).toBeCloseTo(1_000_000 / 111_000, 5);
    expect(extras?.conversionPct).toBe(5);
    expect(extras?.cpc).toBe(200);
    expect(extras?.cpcActual).toBeCloseTo(222, 5);
    expect(extras?.acosPct).toBe(10);
    expect(extras?.acosActualPct).toBeCloseTo(11.1, 5);
    expect(extras?.rpm).toBe(100_000);
    expect(perfExtras({ sales: 1, adSpend: 1, impressions: null, clicks: 1, orders: 1 })).toBeNull();
  });

  it("reads funnel rates as percents from a performance payload", () => {
    const rows = parsePerformance({
      items: [
        {
          product_name: "Tumbler",
          placed_units: 10,
          placed_units_pct_diff: 12,
          confirmed_sales: 890_000,
          product_card_impressions: 1000,
          uv: 80,
          ctr: 0.05,
          placed_order_conversion_rate: 0.02,
          uv_to_add_to_cart_rate: 0.08,
          add_to_cart_buyers: 20,
          placed_buyers: 10,
          confirmed_orders: 8,
          repeat_confirmed_order_rate: 0.1,
          id: 1001,
        },
      ],
    });
    expect(rows[0]).toMatchObject({
      id: "1001",
      name: "Tumbler",
      sold: 10,
      growthPct: 12,
      omzet: 890_000,
      orders: 8,
      impressions: 1000,
      visitors: 80,
      ctrPct: 5,
      convPct: 2,
      addToCartPct: 8,
      cartToCheckoutPct: 50,
      repeatPct: 10,
      salesPerOrder: 89_000,
    });
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
    expect(detectExportKind(["No. Pesanan", "Harga Produk", "Biaya Administrasi", "Ongkir Dibayar Pembeli"])).toBe("keuangan");
    expect(detectExportKind(["Nama Iklan", "Biaya", "Omzet Penjualan"])).toBe("iklan");
    const orders = parseTable(
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Ongkir dibayar pembeli", "Ongkir ke kurir", "Status Pesanan"],
      [["A1", "SKU1", "Tumbler", "2", "80000", "5000", "12000", "Selesai"], ["A2", "SKU1", "Tumbler", "1", "40000", "0", "0", "Batal"]],
    );
    const finance = parseTable(["No. Pesanan", "Harga Produk", "Total Penghasilan", "Biaya Administrasi", "Biaya Layanan"], [["A1", "80000", "75000", "-4000", "-1000"]]);
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
    expect(result.income).toBe(75000);
    expect(result.profit).toBe(75000 - 30000 - 10000);
    expect(result.shortfalls[0]).toMatchObject({ orderNo: "A1", amount: 7000 });
    expect(result.roas).toBe(4);
    expect(parseHppCsv("sku,varian,hpp\nSKU1,Merah,15000")).toEqual({ "SKU1|Merah": 15000 });
  });

  it("rebuilds net income from the signed Shopee finance columns", () => {
    const result = demoProfitSnapshot(5000);
    expect(result.flow.pengiriman).toBe(-3000);
    expect(result.flow.admin + result.flow.proses + result.flow.xtra + result.flow.layanan + result.flow.ams + result.flow.kampanye + result.flow.lainnya + result.flow.pengiriman).toBe(-13600);
    expect(result.income).toBe(85100);
    expect(result.adGmv).toBe(40000);
    expect(result.roas).toBe(4);
    expect(result.profit).toBe(85100 - 30000 - 10000 - 5000);
  });

  it("filters laba by month and prorates an ad report that only overlaps part of the window", () => {
    const ledger = studioLedger();
    expect(listPeriods(ledger.orders, ledger.finance)).toEqual(["2026-10", "2026-09"]);
    expect(periodLabel("2026-10")).toBe("Okt 2026");
    const october = snapshot({ orders: ledger.orders, finance: ledger.finance, ads: ledger.ads, hppBySku: { SKU1: 15_000, SKU2: 8_000 }, claimed: [], period: "2026-10" });
    expect(october.income).toBe(85_100);
    expect(october.hpp).toBe(30_000);
    expect(october.adSpend).toBe(10_000);
    expect(october.prorated).toBe(false);
    expect(october.profit).toBe(45_100);
    const september = snapshot({ orders: ledger.orders, finance: ledger.finance, ads: ledger.ads, hppBySku: { SKU1: 15_000, SKU2: 8_000 }, claimed: [], period: "2026-09" });
    expect(september.income).toBe(19_000);
    expect(september.adSpend).toBe(0);
    expect(september.hpp).toBe(8_000);
    expect(september.profit).toBe(11_000);
    const partial = snapshot({
      orders: ledger.orders,
      finance: ledger.finance,
      ads: ledger.ads,
      hppBySku: { SKU1: 15_000 },
      claimed: [],
      range: { from: "2026-10-15", to: "2026-10-20" },
    });
    expect(partial.orders).toBe(1);
    expect(partial.adSpend).toBeCloseTo(10_000 * (6 / 28), 5);
    expect(partial.prorated).toBe(true);
    expect(adFraction(ledger.ads[0], monthWindow("2026-10"))).toBe(1);
    expect(hppLines(ledger.orders, { SKU1: 15_000, SKU2: 8_000 })).toEqual([
      { sku: "SKU1", name: "Tumbler", product: "Tumbler", variant: "", qty: 2, hpp: 15_000 },
      { sku: "SKU2", name: "Sedotan", product: "Sedotan", variant: "", qty: 1, hpp: 8_000 },
    ]);
    const ads = parseExportGrid([
      ["Periode", "01/10/2026 - 28/10/2026"],
      ["Nama Iklan", "Biaya", "Omzet Penjualan", "Produk Terjual"],
      ["Tumbler", "10000", "40000", "2"],
    ]);
    expect(ads.ads[0]).toMatchObject({ periodFrom: "2026-10-01", periodTo: "2026-10-28", spend: 10_000 });
  });

  it("moves laba when the date basis changes and joins the report that lacks that column", () => {
    const ledger = studioLedger();
    const parsed = parseTable(
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Status Pesanan", "Waktu Pesanan Dibuat", "Waktu Pesanan Dikonfirmasi", "Waktu Pesanan Selesai"],
      [["A1", "SKU1", "Tumbler", "2", "100000", "Selesai", "15/10/2026 09:00", "01/11/2026 08:00", "02/11/2026"]],
    );
    expect(parsed.orders[0]).toMatchObject({ createdAt: "2026-10-15", confirmedAt: "2026-11-01", completedAt: "2026-11-02" });
    const finance = parseTable(
      ["No. Pesanan", "Harga Produk", "Total Penghasilan", "Waktu Pelepasan Dana", "Waktu Pesanan Dibuat"],
      [["A1", "100000", "85100", "05/11/2026", "15/10/2026"]],
    );
    expect(finance.finance[0]).toMatchObject({ releasedAt: "2026-11-05", orderCreatedAt: "2026-10-15", createdAt: "2026-11-05" });

    expect(dateBasisWarning(ledger.orders, ledger.finance, "created")).toBeNull();
    expect(dateBasisWarning(ledger.orders, ledger.finance, "completed")).toMatch(/Laporan Keuangan/);
    expect(dateBasisWarning(ledger.orders, ledger.finance, "released")).toMatch(/Laporan Pesanan/);
    expect(dateBasisWarning([{ ...ledger.orders[0], confirmedAt: null, completedAt: null }], [{ ...ledger.finance[0], releasedAt: null, createdAt: null }], "confirmed")).toMatch(/Waktu Pesanan Dibuat/);

    expect(listPeriods(ledger.orders, ledger.finance, "completed")).toEqual(["2026-11", "2026-09"]);
    expect(listPeriods(ledger.orders, ledger.finance, "released")).toEqual(["2026-11", "2026-10", "2026-09"]);

    const completed = snapshot({
      orders: ledger.orders,
      finance: ledger.finance,
      ads: ledger.ads,
      hppBySku: { SKU1: 15_000, SKU2: 8_000 },
      claimed: [],
      period: "2026-11",
      basis: "completed",
    });
    expect(completed.orders).toBe(1);
    expect(completed.income).toBe(85_100);
    expect(completed.adSpend).toBe(0);
    expect(completed.profit).toBe(55_100);

    const released = snapshot({
      orders: ledger.orders,
      finance: ledger.finance,
      ads: ledger.ads,
      hppBySku: { SKU1: 15_000, SKU2: 8_000 },
      claimed: [],
      period: "2026-11",
      basis: "released",
    });
    expect(released.income).toBe(85_100);
    expect(released.profit).toBe(55_100);

    const releasedOctober = snapshot({
      orders: ledger.orders,
      finance: ledger.finance,
      ads: ledger.ads,
      hppBySku: { SKU1: 15_000, SKU2: 8_000 },
      claimed: [],
      period: "2026-10",
      basis: "released",
    });
    expect(releasedOctober.orders).toBe(0);
    expect(releasedOctober.income).toBe(0);
  });

  it("keeps each store's rows and filters laba to the checked stores", () => {
    const laut = parseExportGrid([
      ["Nama Toko", "Toko Laut"],
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Status Pesanan", "Waktu Pesanan Dibuat"],
      ["C1", "SKU3", "Wajan", "1", "30000", "Selesai", "2026-08-12"],
    ]);
    expect(laut.store).toBe("Toko Laut");
    const dapur = parseExportGrid([
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Status Pesanan", "Waktu Pesanan Dibuat"],
      ["A1", "SKU1", "Tumbler", "1", "100000", "Selesai", "2026-10-15"],
    ]);
    expect(dapur.store).toBe("Default");
    const orders = mergeStoreRows(dapur.orders, laut.orders, laut.store);
    expect(orders.map((row) => row.orderNo)).toEqual(["A1", "C1"]);
    const replaced = mergeStoreRows(orders, laut.orders, "Toko Laut");
    expect(replaced).toHaveLength(2);
    expect(replaced.filter((row) => row.store === "Toko Laut")).toHaveLength(1);
    const finance = [
      { orderNo: "A1", productPrice: 100_000, harga: 100_000, income: 80_000, fees: -20_000, store: "Default" },
      { orderNo: "C1", productPrice: 30_000, harga: 30_000, income: 27_000, fees: -3_000, admin: -3_000, store: "Toko Laut" },
    ];
    expect(listStores(orders, finance, [])).toEqual(["Default", "Toko Laut"]);
    expect(toggleStore("Toko Laut", ["Default", "Toko Laut"], null)).toEqual(["Default"]);
    expect(toggleStore("Toko Laut", ["Default", "Toko Laut"], ["Default"])).toBeNull();
    const onlyLaut = snapshot({ orders, finance, ads: [{ name: "Tumbler", spend: 10_000, gmv: 40_000, orders: 1, store: "Default" }], hppBySku: {}, claimed: [], storeFilter: ["Toko Laut"] });
    expect(onlyLaut.orders).toBe(1);
    expect(onlyLaut.income).toBe(27_000);
    expect(onlyLaut.adSpend).toBe(0);
    const none = snapshot({ orders, finance, ads: [], hppBySku: {}, claimed: [], storeFilter: [] });
    expect(none.orders).toBe(0);
    expect(none.income).toBe(0);
    expect(listPeriods(orders, finance, "created", ["Default"])).toEqual(["2026-10"]);
  });

  it("builds the laba charts from unique orders and classifies the courier", () => {
    expect(shippingClass("SPX Hemat")).toBe("SPX Hemat");
    expect(shippingClass("Instant")).toBe("Instant/Same Day");
    expect(shippingClass("Reguler")).toBe("SPX Standard");
    expect(shippingClass("Kargo")).toBe("SPX Kargo");
    expect(shippingClass("")).toBe("Lainnya");
    const parsed = parseTable(
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Jumlah", "Harga Produk", "Subtotal Pesanan", "Status Pesanan", "Waktu Pesanan Dibuat", "Provinsi", "Metode Pembayaran", "Opsi Pengiriman"],
      [
        ["A1", "SKU1", "Tumbler", "1", "60000", "60000", "Selesai", "2026-10-15", "DKI Jakarta", "ShopeePay", "Hemat"],
        ["A1", "SKU2", "Sedotan", "1", "40000", "40000", "Selesai", "2026-10-15", "DKI Jakarta", "ShopeePay", "Hemat"],
        ["B1", "SKU1", "Tumbler", "1", "20000", "20000", "Batal", "2026-10-16", "Banten", "COD", "Reguler"],
      ],
    );
    expect(parsed.orders[0]).toMatchObject({ subtotal: 60_000, province: "DKI Jakarta", payment: "ShopeePay", shipping: "Hemat" });
    const charts = profitCharts(
      parsed.orders.filter((row) => !row.cancelled),
      { harga: 0, admin: -5_000, proses: -2_000, xtra: 0, layanan: -1_500, ams: -800, kampanye: -200, lainnya: -100, pengiriman: -3_000, promoOngkir: 0, cashback: 0, refund: 0, kompensasi: 0 },
    );
    expect(charts.daily).toEqual([{ date: "2026-10-15", label: "15/10", omzet: 100_000, orders: 1 }]);
    expect(charts.payments).toEqual([{ label: "ShopeePay", count: 1 }]);
    expect(charts.shipping).toEqual([{ label: "SPX Hemat", count: 1 }]);
    expect(charts.provinces[0]).toMatchObject({ label: "DKI Jakarta", omzet: 100_000, orders: 1 });
    expect(charts.products.map((row) => row.sku)).toEqual(["SKU1", "SKU2"]);
    expect(charts.fees.find((row) => row.label === "Lainnya")?.amount).toBe(300);
    expect(charts.fees.find((row) => row.label === "Biaya Admin")?.amount).toBe(5_000);
    const october = snapshot({ orders: studioLedger().orders, finance: studioLedger().finance, ads: studioLedger().ads, hppBySku: { SKU1: 15_000 }, claimed: [], period: "2026-10" });
    expect(october.charts.daily.map((day) => day.date)).toEqual(["2026-10-15"]);
    expect(october.charts.provinces[0]?.label).toBe("DKI Jakarta");
  });

  it("keeps reported ad ROAS and prorates spend, clicks, and conversions", () => {
    const parsed = parseTable(
      ["Nama Iklan", "Status", "Mode Bidding", "Biaya", "Omzet Penjualan", "Konversi", "Jumlah Klik", "Dilihat", "Efektifitas Iklan"],
      [["Tumbler Stainless 600ml Tutup Gelas", "Berjalan", "Iklan Otomatis", "10000", "40000", "2", "1.200", "8.000", "6,40"]],
      { from: "2026-10-01", to: "2026-10-28" },
    );
    expect(parsed.ads[0]).toMatchObject({ status: "Berjalan", mode: "Iklan Otomatis", clicks: 1200, impressions: 8000, roas: 6, spend: 10_000 });
    const detail = adCampaigns(parsed.ads, { from: "2026-10-01", to: "2026-10-06" }, null);
    expect(detail.rows[0].roas).toBe(6);
    expect(detail.rows[0].spend).toBeCloseTo(10_000 * (6 / 28), 5);
    expect(detail.rows[0].clicks).toBeCloseTo(1200 * (6 / 28), 5);
    expect(detail.rows[0].cpa).toBeCloseTo(10_000 / 2, 5);
    expect(detail.prorated).toBe(true);
    expect(adGapNote(detail)).toContain("Laporan iklan khusus periode 01/10/2026–06/10/2026 belum diupload");
    expect(adGapNote(detail)).toContain("01/10/2026–28/10/2026");
    expect(adSignal(6)).toBe("Untung");
    expect(adSignal(3)).toBe("Waspada");
    expect(adSignal(2.99)).toBe("Rugi");
    expect(adChartLabel("Tumbler Stainless Promo")).toBe("Tumbler Stainless Promo…");
    expect(clipAdName("x".repeat(60))).toHaveLength(56);
    const october = snapshot({ orders: studioLedger().orders, finance: studioLedger().finance, ads: studioLedger().ads, hppBySku: {}, claimed: [], period: "2026-10" });
    expect(october.campaigns.rows).toHaveLength(1);
    expect(october.campaigns.rows[0]).toMatchObject({ status: "Berjalan", roas: 4, spend: 10_000, clicks: 120 });
    expect(adSignal(october.campaigns.rows[0].roas)).toBe("Waspada");
    expect(october.campaigns.prorated).toBe(false);
    expect(adGapNote(october.campaigns)).toBeNull();
  });

  it("groups product variants in the HPP master and searches sku, name, and variant", () => {
    const parsed = parseTable(
      ["No. Pesanan", "Nomor Referensi SKU", "Nama Produk", "Nama Variasi", "Jumlah", "Harga Produk", "Status Pesanan"],
      [
        ["A1", "SKU-M", "Tumbler", "Merah", "2", "50000", "Selesai"],
        ["A2", "SKU-B", "Tumbler", "Biru", "1", "50000", "Selesai"],
        ["B1", "", "Sedotan", "", "3", "10000", "Selesai"],
        ["C1", "SKU-X", "Talenan", "", "1", "10000", "Batal"],
      ],
    );
    expect(parsed.orders[0].variant).toBe("Merah");
    const lines = hppLines(parsed.orders, { "SKU-M": 15_000 });
    expect(lines.find((line) => line.sku === "SKU-B")).toMatchObject({ product: "Tumbler", variant: "Biru", qty: 1, hpp: 0 });
    expect(lines.find((line) => line.sku.startsWith("NOSKU::"))?.product).toBe("Sedotan");
    expect(skuDisplayLabel(lines.find((line) => line.product === "Sedotan")!.sku)).toBe("Belum ada SKU");
    expect(lines.some((line) => line.sku === "SKU-X")).toBe(false);
    const open = hppMaster(lines);
    expect(open.rows.find((row) => row.kind === "group")).toMatchObject({ product: "Tumbler", count: 2, filled: 1, collapsed: false, qty: 3 });
    expect(open.totalQty).toBe(6);
    expect(open.totalHpp).toBe(30_000);
    const filled = hppMaster(lines.map((line) => (line.product === "Tumbler" ? { ...line, hpp: 1_000 } : line)));
    expect(filled.rows.find((row) => row.kind === "group")).toMatchObject({ collapsed: true, filled: 2 });
    expect(filled.rows.filter((row) => row.kind === "sku").map((row) => (row.kind === "sku" ? row.line.product : ""))).toEqual(["Sedotan"]);
    expect(filled.totalQty).toBe(6);
    const biru = hppMaster(lines, { query: "biru" });
    expect(biru.rows).toHaveLength(1);
    expect(biru.rows[0]).toMatchObject({ kind: "sku", indent: false });
    const missing = hppMaster(lines, { onlyMissing: true });
    expect(missing.rows.every((row) => row.kind === "sku")).toBe(true);
    expect(missing.totalQty).toBe(4);
  });

  it("parses a csv row with quotes", () => {
    const parsed = parseCsv('Nama,Harga\n"Tumbler, besar",89000\n');
    expect(parsed.rows[0][0]).toBe("Tumbler, besar");
  });
});
