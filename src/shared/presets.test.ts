import { describe, expect, it } from "vitest";
import { matchPreset, type RoasPreset } from "./presets";

const preset = (partial: Partial<RoasPreset>): RoasPreset => ({ hargaJual: 100000, hpp: 40000, ...partial });

describe("preset matching", () => {
  const presets = {
    "Tumbler Stainless": preset({ hpp: 40000, productId: "999" }),
    "Botol Minum": preset({ hpp: 20000, productId: "1001" }),
    Gel: preset({ hpp: 1 }),
  };

  it("prefers product id over a title that also matches", () => {
    const hit = matchPreset(presets, { title: "Tumbler Stainless 600ml", productId: "1001" });
    expect(hit?.name).toBe("Botol Minum");
    expect(hit?.preset.hpp).toBe(20000);
  });

  it("matches a title that contains the preset name", () => {
    expect(matchPreset(presets, { title: "Paket Tumbler Stainless baru", productId: null })?.name).toBe("Tumbler Stainless");
  });

  it("ignores names shorter than 5 characters and unknown titles", () => {
    expect(matchPreset(presets, { title: "Gelas gel", productId: null })).toBeNull();
    expect(matchPreset(presets, { title: "Cangkir Keramik", productId: null })).toBeNull();
  });
});
