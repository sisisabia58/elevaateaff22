import { describe, expect, it } from "vitest";
import { imageZipPlan } from "./images";

describe("image zip plan", () => {
  it("keeps a flat gallery when the product has no variants", () => {
    expect(imageZipPlan(["https://cdn/a.jpg", "https://cdn/a.jpg", ""])).toEqual([{ path: "gambar-1.jpg", url: "https://cdn/a.jpg" }]);
  });

  it("writes the gallery and each variant into its own folder", () => {
    const plan = imageZipPlan(
      ["https://cdn/cover.jpg"],
      [
        { name: "Merah Muda", urls: ["https://cdn/merah.jpg"] },
        { name: "Merah/Muda", urls: ["https://cdn/dua.jpg"] },
        { name: "Tanpa foto", urls: [] },
      ],
    );
    expect(plan.map((entry) => entry.path)).toEqual([
      "galeri/gambar-1.jpg",
      "varian/Merah-Muda/gambar-1.jpg",
      "varian/Merah-Muda-2/gambar-1.jpg",
    ]);
  });
});
