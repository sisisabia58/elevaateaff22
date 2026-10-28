import { describe, expect, it } from "vitest";
import { historiCsv, historiFilename, historiFromLabels, historiProductId, pushSnapshot, roasDeltaPct, updateSnapshotNote } from "./histori";

describe("performance history", () => {
  it("reads the ads strip into a snapshot with actual ad cost", () => {
    const read = historiFromLabels(
      { Penjualan: 1_000_000, "Biaya Iklan": 100_000, "Iklan Dilihat": 10_000, "Jumlah Klik": 500, Pesanan: 25 },
      "1/10 - 28/10 (GMT+7)",
      "cek minggu ini",
      1_700_000_000_000,
    );
    expect(read?.missingConversion).toBe(false);
    expect(read?.snapshot).toMatchObject({
      iklanDilihat: 10_000,
      tingkatKonversi: 5,
      note: "cek minggu ini",
      periodLabel: "1/10 - 28/10 (GMT+7)",
    });
    expect(read?.snapshot.biayaIklanAktual).toBeCloseTo(111_000, 5);
    expect(read?.snapshot.roasAktual).toBeCloseTo(1_000_000 / 111_000, 5);
  });

  it("marks conversion missing until orders and clicks are both present", () => {
    const read = historiFromLabels({ Penjualan: 100, "Biaya Iklan": 10, "Iklan Dilihat": 20 }, "", "  ");
    expect(read?.missingConversion).toBe(true);
    expect(read?.snapshot.tingkatKonversi).toBeNull();
    expect(read?.snapshot.note).toBe("");
  });

  it("keeps the newest 30 snapshots and compares ROAS with the previous one", () => {
    let list = [] as ReturnType<typeof pushSnapshot>;
    for (let index = 0; index < 31; index += 1) {
      const read = historiFromLabels({ Penjualan: 100 + index, "Biaya Iklan": 10, "Iklan Dilihat": 5, "Jumlah Klik": 10, Pesanan: 1 }, "", "", index);
      list = pushSnapshot(list, read!.snapshot);
    }
    expect(list).toHaveLength(30);
    expect(list[0].savedAt).toBe(1);
    expect(roasDeltaPct(18.018018, 9.009009)).toBeCloseTo(100, 3);
    expect(roasDeltaPct(9, null)).toBeNull();
  });

  it("writes the SENA history columns and account filename", () => {
    const read = historiFromLabels(
      { Penjualan: 1_000_000, "Biaya Iklan": 100_000, "Iklan Dilihat": 10_000, "Jumlah Klik": 500, Pesanan: 25 },
      "1/10 - 28/10 (GMT+7)",
      "catatan, dengan koma",
      1_700_000_000_000,
    );
    const csv = historiCsv([read!.snapshot]);
    expect(csv.startsWith("\uFEFFTanggal Simpan,Periode,Iklan Dilihat,Tingkat Konversi (%),Biaya Iklan Aktual (Rp),ROAS Aktual,Catatan Evaluasi")).toBe(true);
    expect(csv).toContain("10000,5,111000,9.01");
    expect(csv).toContain('"catatan, dengan koma"');
    expect(historiFilename("__account__", "2026-10-28")).toBe("histori-performa-akun-2026-10-28.csv");
    expect(historiProductId("https://seller.shopee.co.id/portal/marketing/pas/product/manual/1001")).toBe("1001");
    expect(historiProductId("https://seller.shopee.co.id/portal/marketing/pas")).toBe("__account__");
  });

  it("updates one snapshot note and clears it when the edit is blank", () => {
    const first = historiFromLabels({ Penjualan: 100, "Biaya Iklan": 10, "Iklan Dilihat": 20 }, "", "awal", 1)!.snapshot;
    const second = historiFromLabels({ Penjualan: 200, "Biaya Iklan": 10, "Iklan Dilihat": 20 }, "", "", 2)!.snapshot;
    const edited = updateSnapshotNote([first, second], 2, "  cek iklan  ");
    expect(edited[0].note).toBe("awal");
    expect(edited[1].note).toBe("cek iklan");
    expect(updateSnapshotNote(edited, 2, "   ")[1].note).toBe("");
    expect(updateSnapshotNote(edited, 9, "x")).toBe(edited);
  });
});
