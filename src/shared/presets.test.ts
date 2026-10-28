import { describe, expect, it } from "vitest";
import { importConfirmMessage, matchPreset, mergePresets, parsePresetBackup, presetBackup, type RoasPreset } from "./presets";

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

  it("round-trips a SENA preset file and overwrites colliding names", () => {
    const file = presetBackup({ "Gelas Kaca": preset({ hpp: 15000, productId: "77" }) }, "2026-10-28T00:00:00.000Z");
    expect(file.type).toBe("sena-roas-presets");
    const parsed = parsePresetBackup(JSON.stringify(file));
    expect(parsed.ok && parsed.presets["Gelas Kaca"].hpp).toBe(15000);
    const merged = mergePresets(presets, parsed.ok ? parsed.presets : {});
    expect(merged.collisions).toEqual([]);
    expect(merged.merged["Gelas Kaca"].productId).toBe("77");
    const clash = mergePresets(presets, { "Botol Minum": preset({ hpp: 9000, productId: "1001" }) });
    expect(clash.collisions).toEqual(["Botol Minum"]);
    expect(clash.merged["Botol Minum"].hpp).toBe(9000);
    expect(importConfirmMessage(1, ["Botol Minum"])).toContain("1 nama bentrok");
  });

  it("rejects an empty or unreadable preset file", () => {
    expect(parsePresetBackup("{")).toMatchObject({ ok: false });
    expect(parsePresetBackup("{\"presets\":[]}")).toEqual({ ok: false, error: "File ini bukan file export preset ROAS yang valid." });
    expect(parsePresetBackup("{\"presets\":{}}")).toEqual({ ok: false, error: "File export ini kosong, gak ada preset di dalamnya." });
  });
});
