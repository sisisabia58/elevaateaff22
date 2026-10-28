import { describe, expect, it } from "vitest";
import { itemMetrics, metricsFor, pageAnalytics, rankingForPeriod, shopAgeBucket, shopRelation, tallyReviews } from "./analytics";
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
