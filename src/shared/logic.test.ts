import { describe, expect, it } from "vitest";
import { aiItemInfo, buildCaptions, hasAddToCart, hasBuyNow, isOwnShop, localThread, parseThreadParts, reviewFeature } from "./captions";
import { commissionView, extractOfferLink, parseCommissionList, parseCommissionPayload } from "./commission";
import { estimateCommission, formatAgeShort, formatBigMoney, formatMoney, formatRate, formatShortMoney, marketFromHost, shopeeRawToMajor } from "./money";
import { normalizeSettings } from "./settings";
import { classifyLocation, extractItemList, listKindFromUrl, parseScoutEntry, parseShopeeIds } from "./shopee";
import { DEFAULT_SETTINGS, type ScoutItem } from "./types";

const item: ScoutItem = {
  itemId: "200",
  shopId: "100",
  name: "Tumbler Stainless 600ml",
  price: 89000,
  sold: 1240,
  rating: 4.8,
  image: null,
  shopName: "Dapur Kecil",
  isAd: false,
  url: "https://shopee.co.id/product/100/200",
};

describe("money", () => {
  it("converts Shopee raw prices into rupiah", () => {
    expect(shopeeRawToMajor(8_900_000_000)).toBe(89000);
    expect(shopeeRawToMajor(0)).toBeNull();
  });

  it("formats IDR without decimals and MYR with decimals", () => {
    expect(formatMoney(89000, marketFromHost("shopee.co.id"))).toBe("Rp89.000");
    expect(formatBigMoney(66_288_000, marketFromHost("shopee.co.id"))).toBe("Rp66,3Jt");
    expect(formatShortMoney(29_000, marketFromHost("shopee.co.id"))).toBe("Rp29rb");
    expect(formatShortMoney(1_200_000, marketFromHost("shopee.co.id"))).toBe("Rp1,2jt");
    expect(formatAgeShort(45, marketFromHost("shopee.co.id"))).toBe("2 bln");
    expect(formatAgeShort(400, marketFromHost("shopee.co.id"))).toBe("1,1 thn");
    expect(formatMoney(-5000, marketFromHost("shopee.co.id"))).toBe("–Rp5.000");
    expect(formatMoney(19.5, marketFromHost("shopee.com.my"))).toBe("RM 19.50");
  });

  it("estimates commission from the default rate", () => {
    expect(estimateCommission(89000, 8)).toBe(7120);
    expect(formatRate(8)).toBe("8%");
    expect(formatRate(8.25)).toBe("8.3%");
  });
});

describe("commission payload", () => {
  it("reads a live offer response", () => {
    const live = parseCommissionPayload(
      {
        code: 0,
        data: {
          commission_rate: { default_commission_rate: "12", seller_commission_rate: "2,5", default_commission: "10680" },
          affiliate_promoted_last_7days: 14,
          is_free_sample: true,
        },
      },
      89000,
    );
    expect(live).toMatchObject({ ratePct: 12, amount: 10680, xtraRatePct: 2.5, promotedLast7d: 14, freeSample: true });
  });

  it("falls back to an estimate when the account is not an affiliate session", () => {
    expect(parseCommissionPayload({ code: 90309999, data: null }, 89000)).toBeNull();
    const view = commissionView(item, DEFAULT_SETTINGS, null);
    expect(view.source).toBe("estimate");
    expect(view.amount).toBe(7120);
  });

  it("maps a shop commission list by item id", () => {
    const map = parseCommissionList({
      code: 0,
      data: { list: [{ item_id: 200, default_commission_rate: 9, is_free_sample: false }] },
    });
    expect(map.get("200")).toEqual({ ratePct: 9, freeSample: false, promotedLast7d: null });
  });

  it("extracts an affiliate offer link", () => {
    expect(extractOfferLink({ data: { productOfferLinks: [{ productOfferLink: "https://shope.ee/abc" }] } })).toBe(
      "https://shope.ee/abc",
    );
    expect(extractOfferLink({ data: {} })).toBeNull();
  });
});

describe("shopee pages", () => {
  it("classifies product, search, shop, and other urls", () => {
    expect(parseShopeeIds("https://shopee.co.id/Tumbler-i.100.200")).toEqual({ shopId: "100", itemId: "200" });
    expect(classifyLocation("https://shopee.co.id/Tumbler-i.100.200")).toBe("product");
    expect(classifyLocation("https://shopee.co.id/search?keyword=tumbler")).toBe("search");
    expect(classifyLocation("https://shopee.co.id/Peralatan-Dapur-cat.11043350")).toBe("category");
    expect(classifyLocation("https://shopee.co.id/Peralatan-Dapur-cat.11043350.1104")).toBe("category");
    expect(classifyLocation("https://shopee.co.id/dapurkecil")).toBe("shop");
    expect(classifyLocation("https://shopee.co.id/cart")).toBe("other");
    expect(classifyLocation("https://seller.shopee.co.id/portal")).toBe("other");
  });

  it("normalizes a search card into a scout item", () => {
    const payload = {
      items: [
        {
          adsid: 9,
          item_basic: {
            itemid: 200,
            shopid: 100,
            name: "Tumbler Stainless 600ml",
            price: 8_900_000_000,
            historical_sold: 1240,
            shop_name: "Dapur Kecil",
            item_rating: { rating_star: 4.9 },
          },
        },
      ],
    };
    const list = extractItemList(payload);
    const parsed = parseScoutEntry(list?.[0], "https://shopee.co.id");
    expect(parsed).toMatchObject({
      itemId: "200",
      shopId: "100",
      price: 89000,
      sold: 1240,
      isAd: true,
      url: "https://shopee.co.id/product/100/200",
    });
    expect(listKindFromUrl("https://shopee.co.id/api/v4/search/search_items?keyword=tumbler")).toBe("search");
  });
});

describe("captions and settings", () => {
  it("puts the chosen tone first and keeps the product name in every caption", () => {
    const captions = buildCaptions(item, marketFromHost("shopee.co.id"), "cerita");
    expect(captions.map((caption) => caption.id)).toEqual(["cerita", "santai", "singkat"]);
    for (const caption of captions) expect(caption.text).toContain(item.name);
    expect(captions[1].text).toContain("Rp89.000");
    const thread = localThread(item, marketFromHost("shopee.co.id"), "listicle");
    expect(thread).toContain(item.name);
    expect(thread).toContain("Rp89.000");
  });

  it("splits a thread on the part marker and tells own shop from a competitor page", () => {
    expect(parseThreadParts("Bagian satu\n===PART===\nBagian dua")).toEqual(["Bagian satu", "Bagian dua"]);
    expect(parseThreadParts("  ")).toEqual([]);
    expect(hasBuyNow(["Beli Sekarang", "Salin caption"])).toBe(true);
    expect(hasAddToCart(["Masukkan Keranjang"])).toBe(true);
    expect(isOwnShop(["Analisa AI", "Thread Affiliate"])).toBe(true);
    expect(reviewFeature(["Beli Sekarang"])).toBe("competitor_review");
    expect(reviewFeature(["Simpan"])).toBe("own_shop_review");
    expect(aiItemInfo({ ...item, models: [{ name: "Hitam", images: [] }], monthlySold: 80 })).toMatchObject({
      name: item.name,
      price: item.price,
      totalSold: item.sold,
      sold30d: 80,
      models: [{ name: "Hitam", price: null }],
    });
  });

  it("clamps a bad saved rate", () => {
    expect(normalizeSettings({ defaultRatePct: 200, tone: "nope", showScout: false })).toEqual({
      defaultRatePct: 60,
      tone: "santai",
      showScout: false,
      geminiApiKey: "",
      geminiModel: "gemini-2.5-flash",
    });
  });
});
