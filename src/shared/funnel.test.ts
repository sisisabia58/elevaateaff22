import { describe, expect, it } from "vitest";
import { classifyPortfolio, funnelCsv, mergeServerClass } from "./funnel";
import type { PerfProduct } from "./research";

const row = (partial: Partial<PerfProduct> & Pick<PerfProduct, "name">): PerfProduct => ({
  sold: 0,
  growthPct: 0,
  ...partial,
});

describe("funnel portfolio", () => {
  const catalog = [
    row({ id: "a", name: "Sehat", visitors: 100, convPct: 4, ctrPct: 8, addToCartPct: 6, cartToCheckoutPct: 40, impressions: 1000, omzet: 500000 }),
    row({ id: "b", name: "Eksposur", visitors: 10, convPct: 4, ctrPct: 8, addToCartPct: 6, cartToCheckoutPct: 40 }),
    row({ id: "c", name: "Klik", visitors: 100, convPct: 1, ctrPct: 1, addToCartPct: 6, cartToCheckoutPct: 40 }),
    row({ id: "d", name: "Keranjang", visitors: 100, convPct: 1, ctrPct: 8, addToCartPct: 1, cartToCheckoutPct: 40 }),
    row({ id: "e", name: "Checkout", visitors: 100, convPct: 4, ctrPct: 8, addToCartPct: 6, cartToCheckoutPct: 5 }),
  ];

  it("splits BCG on visitor and conversion medians and names the first weak stage", () => {
    const { rows, bench } = classifyPortfolio(catalog);
    expect(bench.visitors).toBe(100);
    expect(bench.conv).toBe(4);
    expect(rows.map((item) => [item.name, item.tier, item.diagnosis])).toEqual([
      ["Sehat", "star", "sehat"],
      ["Eksposur", "cashcow", "exposure"],
      ["Klik", "question", "ctr"],
      ["Keranjang", "question", "addtocart"],
      ["Checkout", "star", "checkout"],
    ]);
  });

  it("leaves a row unknown when visitors or conversion are missing", () => {
    const { rows } = classifyPortfolio([row({ name: "Kosong", impressions: 10 })]);
    expect(rows[0].tier).toBe("unknown");
    expect(rows[0].diagnosis).toBe("unknown");
  });

  it("keeps the server tier when feature-proxy returns one", () => {
    const local = classifyPortfolio(catalog).rows;
    const merged = mergeServerClass(local, { results: [{ id: "b", tier: { key: "dog" }, diagnosis: { key: "sehat" } }] });
    expect(merged.find((item) => item.id === "b")).toMatchObject({ tier: "dog", diagnosis: "sehat" });
    expect(merged.find((item) => item.id === "a")?.tier).toBe("star");
  });

  it("writes the SENA export columns", () => {
    const csv = funnelCsv(classifyPortfolio(catalog).rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("ID Produk,Nama Produk,Tier BCG,Diagnosis Bottleneck");
    expect(csv).toContain("Minim eksposur");
    expect(csv).toContain("⭐ Star");
  });
});
