import { describe, expect, it } from "vitest";
import { EMPTY_ROAS } from "./roas";
import { SAMPLE_ORDER_INCOME, formatOrderPct, orderProfit, parseOrderIncome } from "./order-profit";

const hpp = { SKU1: 15_000 };
const presets = {
  Tumbler: { ...EMPTY_ROAS, hargaJual: 100_000, hpp: 40_000, productId: "1001" },
  Talenan: { ...EMPTY_ROAS, hargaJual: 77_000, hpp: 20_000 },
};

describe("order profit", () => {
  it("reads escrow and fee shares from the seller income payload", () => {
    const parsed = parseOrderIncome(SAMPLE_ORDER_INCOME);
    expect(parsed?.netIncome).toBe(91_000);
    expect(parsed?.fees).toMatchObject({
      merchandiseSubtotal: 100_000,
      platformPct: 6,
      fssPct: 1,
      servicePct: 1.5,
      promotionPct: 0.4,
      otherPct: 0.1,
      totalFees: 9_000,
      totalPct: 9,
    });
    expect(formatOrderPct(parsed?.fees?.platformPct || 0)).toBe("6,00%");
  });

  it("subtracts SKU HPP first, then a ROAS preset, and keeps the profit share of the product price", () => {
    const parsed = parseOrderIncome(SAMPLE_ORDER_INCOME);
    expect(parsed).not.toBeNull();
    const state = orderProfit(parsed!, hpp, presets);
    expect(state.totalHpp).toBe(50_000);
    expect(state.profit).toBe(41_000);
    expect(state.profitPct).toBe(41);
    expect(state.skuMatchedCount).toBe(1);
    expect(state.matchedCount).toBe(2);
    expect(state.note?.tone).toBe("info");
    expect(state.note?.text).toContain("1 dari 2 item pakai estimasi HPP");
  });

  it("warns when an item has neither SKU HPP nor a preset", () => {
    const parsed = parseOrderIncome({
      seller_income_breakdown: {
        breakdown: [
          { field_name: "MERCHANDISE_SUBTOTAL", amount: 100_000 * 100_000 },
          { field_name: "ESCROW_AMOUNT", amount: 91_000 * 100_000 },
        ],
      },
      order_item_list: {
        order_items: [{ amount: 1, product_name: "Gelas Plastik", item_id: 9 }],
      },
    });
    expect(parsed?.fees?.otherPct).toBeNull();
    const state = orderProfit(parsed!, {}, {});
    expect(state.profit).toBe(91_000);
    expect(state.profitPct).toBeNull();
    expect(state.note?.text).toContain("belum dikurangi modal");
  });

  it("ignores a payload that has no escrow field", () => {
    expect(parseOrderIncome({ seller_income_breakdown: { breakdown: [] } })).toBeNull();
  });
});
