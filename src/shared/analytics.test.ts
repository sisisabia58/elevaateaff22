import { describe, expect, it } from "vitest";
import { bucketMeasure, itemBucketIndex, itemMetrics, metricHistogram, metricsFor, pageAnalytics, quantileEdges, rankingForPeriod, searchOverview, shopAgeBucket, shopOverview, shopRelation, tallyReviews } from "./analytics";
import { parseScoutEntry, productDetailEntry } from "./shopee";
import type { ScoutItem } from "./types";

const NOW = Date.UTC(2026, 9, 27);

function product(partial: Partial<ScoutItem> & Pick<ScoutItem, "itemId">): ScoutItem {
  return {
    shopId: "1",
    name: partial.itemId,
    price: 100_000,
    sold: 300,
    rating: 4.8,
    image: null,
    shopName: "Toko",
    isAd: false,
    url: "https://shopee.co.id/product/1/" + partial.itemId,
    ctime: NOW / 1000 - 90 * 86400,
    monthlySold: 150,
    ...partial,
  };
}

describe("product analytics", () => {
  it("derives 30-day omzet and trend without dividing rupiah again", () => {
    const metrics = itemMetrics(product({ itemId: "a" }), NOW);
    expect(metrics.soldPerMonth).toBeCloseTo(100, 5);
    expect(metrics.sold30d).toBe(150);
    expect(metrics.trendPct).toBeCloseTo(50, 5);
    expect(metrics.omset30d).toBe(15_000_000);
    expect(metrics.omsetPerBulan).toBeCloseTo(10_000_000, 0);
    expect(metrics.totalOmset).toBe(30_000_000);
  });

  it("sums market size from 30-day omzet and keeps the price and age span", () => {
    const items = [
      product({ itemId: "a", price: 50_000, ctime: NOW / 1000 - 20 * 86400, monthlySold: 10, sold: 10 }),
      product({ itemId: "b", price: 1_200_000, ctime: NOW / 1000 - 400 * 86400, monthlySold: 20, sold: 400 }),
    ];
    const overview = searchOverview(items, NOW);
    expect(overview.marketSize).toBe(50_000 * 10 + 1_200_000 * 20);
    expect(overview.priceMin).toBe(50_000);
    expect(overview.priceMax).toBe(1_200_000);
    expect(overview.ageMinDays).toBeCloseTo(20, 5);
    expect(overview.ageMaxDays).toBeCloseTo(400, 5);
  });

  it("sums shop omzet per month and the last 30 days", () => {
    const items = [product({ itemId: "a" }), product({ itemId: "b", price: 20_000, monthlySold: 40, sold: 80 })];
    const overview = shopOverview(items, NOW);
    expect(overview.omset30d).toBe(15_000_000 + 800_000);
    expect(overview.sold30d).toBe(190);
    expect(overview.priceMin).toBe(20_000);
    expect(overview.priceMax).toBe(100_000);
  });

  it("drops the false one-sold signal and hides trend on a young listing", () => {
    const noisy = itemMetrics(product({ itemId: "b", sold: 1, monthlySold: 1, ctime: NOW / 1000 - 30 * 86400 }), NOW);
    expect(noisy.sold30d).toBeNull();
    expect(noisy.trendPct).toBeNull();
    const young = itemMetrics(product({ itemId: "c", ctime: NOW / 1000 - 40 * 86400, monthlySold: 80, sold: 400 }), NOW);
    expect(young.trendPct).toBeNull();
    expect(young.sold30d).toBe(80);
  });

  it("values stock and shares omzet across the page", () => {
    const withStock = itemMetrics(product({ itemId: "d", stock: 4 }), NOW);
    expect(withStock.stockValue).toBe(400_000);
    const rows = [product({ itemId: "low", sold: 100, monthlySold: 10 }), product({ itemId: "high", sold: 300, monthlySold: 30 })];
    const shared = metricsFor(rows, NOW);
    expect(shared.get("low")?.shopOmzetSharePct).toBeCloseTo(25, 5);
    expect(shared.get("high")?.marketSharePct).toBeCloseTo(75, 5);
  });

  it("buckets shop age and names an unfollowed shop as our own", () => {
    expect(shopAgeBucket(NOW / 1000 - 100 * 86400, NOW)).toBe("3–6 bln");
    expect(shopAgeBucket(NOW / 1000 - 400 * 86400, NOW)).toBe("1–2 thn");
    expect(shopAgeBucket(null, NOW)).toBeNull();
    expect(shopRelation(false, false)).toBe("Toko sendiri");
    expect(shopRelation(true, false)).toBe("Toko kompetitor");
    const summary = pageAnalytics([product({ itemId: "ad", isAd: true }), product({ itemId: "plain" })], NOW);
    expect(summary.adCount).toBe(1);
    expect(summary.totalSold).toBe(600);
    expect(summary.averagePrice).toBe(100_000);
  });

  it("reads monthly sold text, rating count, and the ad keyword from a search card", () => {
    const parsed = parseScoutEntry(
      {
        ads_keyword: "tumbler",
        match_type: 2,
        item_basic: {
          itemid: 9,
          shopid: 8,
          name: "Tumbler",
          price: 5_000_000_000,
          ctime: 1_700_000_000,
          liked_count: 12,
          is_sold_out: false,
          item_card_display_sold_count: {
            historical_sold_count_text: "1,2RB",
            monthly_sold_count_text: "200",
          },
          item_rating: { rating_star: 4.5, rating_count: [1, 0, 0, 2, 7] },
        },
      },
      "https://shopee.co.id",
    );
    expect(parsed?.price).toBe(50000);
    expect(parsed).toMatchObject({
      sold: 1200,
      monthlySold: 200,
      ratingCount: 10,
      wishlist: 12,
      soldOut: false,
      adKeyword: "tumbler",
      adMode: "2",
      isAd: true,
      ctime: 1_700_000_000,
    });
    const detail = parseScoutEntry(
      {
        data: {
          itemid: 9,
          shopid: 8,
          name: "Tumbler",
          price: 5_000_000_000,
          stock: 6,
          ctime: 1_700_000_000,
          liked_count: 4,
          historical_sold: 900,
          sold: 40,
          item_rating: { rating_star: 4.9, rating_count: [0, 0, 1, 2, 3] },
        },
      },
      "https://shopee.co.id",
    );
    const duplicated = parseScoutEntry(
      {
        item_basic: {
          itemid: 3,
          shopid: 8,
          name: "Tumbler",
          price: 5_000_000_000,
          historical_sold: 900,
          sold: 900,
        },
      },
      "https://shopee.co.id",
    );
    expect(duplicated).toMatchObject({ sold: 900, monthlySold: null });
    const page = parseScoutEntry(
      productDetailEntry({
        data: {
          item: { itemid: 11, shopid: 22, name: "Kaos Kaki", ctime: 1_700_000_000, stock: 20 },
          product_price: { price: 1_500_000_000 },
          product_review: {
            rating_star: 4.9,
            total_rating_count: 21500,
            historical_sold: 10000,
            sold: 800,
            liked_count: 3200,
          },
        },
      }),
      "https://shopee.co.id",
    );
    expect(page).toMatchObject({
      price: 15000,
      sold: 10000,
      monthlySold: 800,
      ratingCount: 21500,
      wishlist: 3200,
      rating: 4.9,
      stock: 20,
      ctime: 1_700_000_000,
    });
    expect(detail).toMatchObject({
      sold: 900,
      monthlySold: 40,
      stock: 6,
      wishlist: 4,
      ratingCount: 6,
      soldOut: false,
      ctime: 1_700_000_000,
    });
  });

  it("bins price, listing age, and shop age on the same rows", () => {
    const rows = [
      product({ itemId: "p1", price: 10_000, ctime: NOW / 1000 - 10 * 86400, shopId: "s1" }),
      product({ itemId: "p2", price: 50_000, ctime: NOW / 1000 - 100 * 86400, shopId: "s2" }),
      product({ itemId: "p3", price: 20_000, ctime: null }),
    ];
    const price = metricHistogram(rows, NOW, 5, "price");
    expect(price).toHaveLength(3);
    expect(price.reduce((sum, bar) => sum + bar.count, 0)).toBe(3);
    expect(itemBucketIndex(rows[0], price, "price", NOW)).toBe(0);
    expect(itemBucketIndex(rows[1], price, "price", NOW)).toBe(2);
    const age = metricHistogram(rows, NOW, 5, "age");
    expect(age.reduce((sum, bar) => sum + bar.count, 0)).toBe(2);
    expect(age[0]?.label.endsWith("hr")).toBe(true);
    expect(itemBucketIndex(rows[0], age, "age", NOW)).not.toBe(itemBucketIndex(rows[1], age, "age", NOW));
    expect(itemBucketIndex(rows[2], age, "age", NOW)).toBeNull();
    expect(metricHistogram(rows, NOW, 5, "shopAge", {})).toEqual([]);
    const shops = { s1: NOW / 1000 - 40 * 86400, s2: NOW / 1000 - 800 * 86400 };
    const shopAge = metricHistogram(rows, NOW, 5, "shopAge", shops);
    expect(shopAge.map((bar) => bar.label)).toEqual(["<3 bln", "2–5 thn"]);
    expect(itemBucketIndex(rows[1], shopAge, "shopAge", NOW, shops)).toBe(1);
    const priced = metricHistogram([product({ itemId: "om", price: 10_000, sold: 4, monthlySold: 2, wishlist: 7 })], NOW);
    expect(bucketMeasure(priced[0], "wishlist")).toBe(7);
    expect(bucketMeasure(priced[0], "totalSold")).toBe(4);
    expect(bucketMeasure(priced[0], "omset30d")).toBe(20_000);
    const spread = [10_000, 20_000, 30_000, 40_000, 50_000, 60_000].map((price, index) =>
      product({ itemId: `q${index}`, price }),
    );
    expect(metricHistogram(spread, NOW)).toHaveLength(6);
    const edges = quantileEdges([10, 20, 30, 40, 50, 60], 6);
    expect(edges).toHaveLength(7);
    expect(edges?.[0]).toBe(10);
    expect(edges?.[3]).toBe(35);
    expect(edges?.[6]).toBe(60);
    expect(itemBucketIndex(spread[5], metricHistogram(spread, NOW), "price", NOW)).toBe(5);
  });

  it("reads variant galleries from tier options, then from model rows", () => {
    const tiers = parseScoutEntry(
      {
        itemid: 4,
        shopid: 8,
        name: "Kaos",
        price: 2_000_000_000,
        tier_variations: [{ name: "Warna", options: ["Hitam", "Putih"], images: ["hitam", "putih"] }],
      },
      "https://shopee.co.id",
    );
    expect(tiers?.models).toEqual([
      { name: "Hitam", images: ["https://down-id.img.susercontent.com/hitam"] },
      { name: "Putih", images: ["https://down-id.img.susercontent.com/putih"] },
    ]);
    const models = parseScoutEntry(
      {
        itemid: 5,
        shopid: 8,
        name: "Kaos",
        price: 2_000_000_000,
        models: [{ name: "Merah", image: "merah" }, { model_name: "Biru" }],
      },
      "https://shopee.co.id",
    );
    expect(models?.models).toEqual([{ name: "Merah", images: ["https://down-id.img.susercontent.com/merah"] }]);
  });

  it("counts variant mentions inside 30 and 90 days", () => {
    const reviews = [
      { ctime: NOW / 1000 - 10 * 86400, product_items: [{ model_name: "Merah" }] },
      { ctime: NOW / 1000 - 40 * 86400, product_items: [{ model_name: "Biru" }] },
      { ctime: NOW / 1000 - 10 * 86400, comment: "bagus" },
    ];
    expect(tallyReviews(reviews, "d30", NOW)).toMatchObject({ sorted: [{ name: "Merah", count: 1 }], withoutVariant: 1 });
    expect(tallyReviews(reviews, "d90", NOW).sorted.map((row) => row.name)).toEqual(["Merah", "Biru"]);
    expect(tallyReviews(reviews, "all", NOW).withoutVariant).toBe(1);
    const server = { d30: { sorted: [{ name: "Server", count: 4 }] }, d90: { sorted: [{ name: "Lama", count: 2 }] }, all: { sorted: [{ name: "Semua", count: 9 }], withoutVariant: 3 } };
    expect(rankingForPeriod(server, reviews, "d30", NOW).sorted[0]?.name).toBe("Server");
    expect(rankingForPeriod(server, reviews, "all", NOW).withoutVariant).toBe(3);
    expect(rankingForPeriod({ sorted: [{ name: "Satu", count: 1 }] }, reviews, "d90", NOW).sorted.map((row) => row.name)).toEqual(["Merah", "Biru"]);
  });
});
