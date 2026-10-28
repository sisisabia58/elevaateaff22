import { describe, expect, it } from "vitest";
import { buildDashboardBackup, clearDataConfirm, importLogRowsLabel, importStatus, parseDashboardBackup, rememberImport, rememberLog, STALE_DAYS } from "./imports";

const now = Date.UTC(2026, 9, 28, 12);
const day = 86_400_000;

describe("import chips", () => {
  it("marks a report stale only after 35 days and keeps the newest file", () => {
    expect(STALE_DAYS).toBe(35);
    const fresh = importStatus([{ type: "pesanan", filename: "a.xlsx", ts: now - 35 * day }], now);
    expect(fresh[0].state).toBe("ok");
    expect(fresh[0].status.startsWith("Terakhir:")).toBe(true);
    expect(fresh[1].state).toBe("missing");
    expect(fresh[1].status).toBe("Belum diupload");
    expect(fresh[2].status).toBe("Belum diupload");
    const stale = importStatus([{ type: "keuangan", filename: "uang.xlsx", ts: now - 35 * day - 1 }], now);
    expect(stale[1].state).toBe("stale");
    expect(stale[1].title).toContain("udah lebih dari sebulan, cek lagi apa perlu upload yang baru");
    expect(rememberImport([{ type: "iklan", filename: "lama.csv", ts: 1 }], { type: "iklan", filename: "baru.csv", ts: 2 })).toEqual([
      { type: "iklan", filename: "baru.csv", ts: 2 },
    ]);
  });

  it("keeps a 500-row import log and restores a version-2 backup", () => {
    expect(importLogRowsLabel({ added: 3, updated: 0 })).toBe("+3 baru");
    expect(importLogRowsLabel({ added: 1, updated: 2 })).toBe("+1 baru, 2 update");
    expect(importLogRowsLabel({ added: 0, updated: 0 })).toBe("—");
    const filled = Array.from({ length: 500 }, (_, index) => ({ ts: index, type: "pesanan" as const, filename: "a.xlsx", store: "Default", added: 1, updated: 0 }));
    const next = rememberLog(filled, { ts: 900, type: "hpp", filename: "hpp.csv", store: "—", added: 4, updated: 0 });
    expect(next).toHaveLength(500);
    expect(next[0].type).toBe("hpp");
    expect(next.some((row) => row.ts === 499)).toBe(false);
    const backup = buildDashboardBackup({ hpp: { SKU1: 15_000 }, importLog: next.slice(0, 1), orders: [{ orderNo: "A1" }] }, new Date("2026-10-28T09:00:00.000Z"));
    expect(backup._backupVersion).toBe(2);
    expect(backup.data).toEqual({ orders: [{ orderNo: "A1" }] });
    expect(parseDashboardBackup(JSON.stringify(backup)).hpp).toEqual({ SKU1: 15_000 });
    expect(() => parseDashboardBackup("{}")).toThrow("File ini bukan file backup dashboard yang valid.");
    expect(clearDataConfirm(0)).toBe("Hapus semua data yang tersimpan?");
    expect(clearDataConfirm(2)).toContain("2 riwayat import");
  });
});
