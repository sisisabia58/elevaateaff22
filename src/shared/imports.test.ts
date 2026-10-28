import { describe, expect, it } from "vitest";
import { importStatus, rememberImport, STALE_DAYS } from "./imports";

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
});
