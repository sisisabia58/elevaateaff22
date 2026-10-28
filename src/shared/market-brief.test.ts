import { describe, expect, it } from "vitest";
import { aiFilterLabel, marketDataBlock, seasonalCalendarBlock, shopDataBlock } from "./market-brief";
import { marketFromHost } from "./money";
import type { ScoutItem } from "./types";

const NOW = Date.UTC(2026, 9, 28);
const market = marketFromHost("shopee.co.id");

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

describe("market AI brief", () => {
  it("builds a search brief with omzet momentum, one currency mark per price band, and the seasonal calendar", () => {
    const items = [
      product({ itemId: "a", name: "Tumbler Stainless", shopName: "Dapur Kecil", price: 29_000, monthlySold: 10, sold: 40 }),
      product({ itemId: "b", name: "Talenan Kayu", shopName: "Meja Masak", price: 154_000, monthlySold: 20, sold: 80 }),
    ];
    const block = marketDataBlock(items, { pageType: "search", keyword: "tumbler", filterLabel: "Rp29rb-154rb" }, market, NOW);
    expect(block).toContain('DATA PASAR (keyword: "tumbler", DIFILTER ke rentang Rp29rb-154rb, 2 produk dari 2 toko)');
    expect(block).toContain("Market size (omset 30 hari, rentang terfilter)");
    expect(block).toContain("INI PERSENTASE OMSET, BUKAN persentase jumlah produk");
    expect(block).toContain("SEBARAN HARGA");
    expect(block).toContain("BAHAN MENTAH");
    expect(block).toContain("trend turun 25%");
    expect(block).toContain("trennya naik");
    expect(block).toContain("KALENDER MUSIMAN");
    expect(block).toContain("Harbolnas 10.10: 18 hari yang lalu");
    expect(block).toContain("Halloween: 3 hari lagi");
    expect(block).not.toContain("Harbolnas 9.9");
    const bands = block.split("SEBARAN HARGA")[1]?.split("BAHAN MENTAH")[0] ?? "";
    expect(bands.match(/^- Rp/gm)?.length).toBe(6);
    expect(bands).not.toMatch(/Rp[^:\n]*Rp/);
  });

  it("names a shop as competitor or own shop and separates quiet old listings from new ones", () => {
    const items = [
      product({
        itemId: "old",
        name: "Listing Sepi",
        price: 50_000,
        sold: 0,
        monthlySold: 0,
        soldOut: true,
        ctime: NOW / 1000 - 200 * 86400,
      }),
      product({
        itemId: "new",
        name: "Listing Baru",
        price: 40_000,
        sold: 40,
        monthlySold: 30,
        soldOut: false,
        ctime: NOW / 1000 - 20 * 86400,
      }),
    ];
    const competitor = shopDataBlock(items, false, market, NOW);
    expect(competitor).toContain("toko KOMPETITOR (bukan milik user)");
    expect(shopDataBlock(items, true, market, NOW)).toContain("toko SENDIRI (milik user yang membaca ini)");
    expect(competitor).toContain("Listing lama & sepi");
    expect(competitor).toContain("Listing Baru - umur");
    expect(competitor).toContain("POLA/TEMA");
    expect(competitor).toContain("Rate stok habis: 50%");
    expect(competitor).not.toContain("trend naik");
    expect(competitor).toContain("KALENDER MUSIMAN");
  });

  it("labels a selected chart bucket the way the market prompt expects", () => {
    expect(aiFilterLabel({ label: "<3 bln", min: 0, max: 0 }, "shopAge", market)).toBe("toko <3 bln");
    expect(aiFilterLabel({ label: "", min: 29_000, max: 154_000 }, "price", market)).toBe("Rp29rb-154rb");
    expect(seasonalCalendarBlock(new Date(2026, 9, 28))).toContain("PAKAI APA ADANYA");
  });
});
