import { describe, expect, it } from "vitest";
import { adAktualLabel, columnBadges, isProductTitle, type ColumnHeader, type ColumnNumber } from "./ad-columns";
import type { RoasPreset } from "./presets";
import { EMPTY_ROAS, profitBadgeText } from "./roas";

const presets: Record<string, RoasPreset> = {
  Tumbler: { ...EMPTY_ROAS, hargaJual: 100_000, hpp: 40_000, productId: "1001" },
  Talenan: { ...EMPTY_ROAS, hargaJual: 77_000, hpp: 20_000 },
};

const headers: ColumnHeader[] = [
  { label: "Produk", x: 110, width: 220 },
  { label: "Sales", x: 286, width: 96 },
  { label: "Items Sold", x: 406, width: 96 },
  { label: "Konversi", x: 526, width: 96 },
  { label: "Expense", x: 646, width: 96 },
  { label: "ROAS", x: 766, width: 96 },
];

function row(y: number, sales: string, sold: string, orders: string, ads: string, roas: string): ColumnNumber[] {
  return [
    { text: sales, x: 286, y },
    { text: sold, x: 406, y },
    { text: orders, x: 526, y },
    { text: ads, x: 646, y },
    { text: roas, x: 766, y },
  ];
}

describe("ads column badges", () => {
  it("keeps short labels and bare prices out of the title list", () => {
    expect(isProductTitle("Tumbler Stainless 600ml Tutup Sedotan")).toBe(true);
    expect(isProductTitle("Talenan Kayu")).toBe(false);
    expect(isProductTitle("Rp890.000")).toBe(false);
  });

  it("pairs a sales cell with the nearest title and preset", () => {
    const rows = columnBadges(
      {
        headers,
        numbers: [
          ...row(80, "Rp890.000", "10", "8", "Rp50.000", "16,00"),
          ...row(160, "Rp154.000", "2", "2", "Rp80.000", "1,50"),
          ...row(240, "Rp50.000", "1", "1", "Rp10.000", "5,00"),
          { text: "Rp9.999", x: 20, y: 80 },
        ],
        titles: [
          { text: "Tumbler Stainless 600ml Tutup Sedotan", y: 80, productId: "1001" },
          { text: "Talenan Kayu Jati Tebal untuk Dapur", y: 160 },
          { text: "Gelas Plastik Transparan 500ml Isi 6", y: 240 },
          { text: "Rak Dinding Besi Minimalis 60cm Putih", y: 400 },
        ],
      },
      presets,
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      productId: "1001",
      profit: profitBadgeText(434_500),
      zone: "Bagus",
      ad: adAktualLabel(50_000),
    });
    expect(rows[1]).toMatchObject({ profit: profitBadgeText(25_200), zone: "Rugi", ad: adAktualLabel(80_000) });
    expect(rows[2]).toMatchObject({ profit: "Perlu Setup", zone: "Perlu Setup", ad: adAktualLabel(10_000) });
  });

  it("drops a sales figure that has no title within 90px", () => {
    const rows = columnBadges(
      {
        headers,
        numbers: row(0, "Rp890.000", "10", "8", "Rp50.000", "16,00"),
        titles: [{ text: "Tumbler Stainless 600ml Tutup Sedotan", y: 120, productId: "1001" }],
      },
      presets,
    );
    expect(rows).toEqual([]);
  });
});
