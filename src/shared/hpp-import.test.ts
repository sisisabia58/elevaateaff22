import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { readHppFile } from "./hpp-import";

describe("readHppFile", () => {
  it("reads the first sheet of an xlsx and rejects other formats", async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["SKU", "HPP"], ["SKU9", "15.000"], ["", "20"]]), "HPP");
    const bytes = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const file = new File([bytes], "hpp.xlsx");
    const result = await readHppFile(file);
    expect(result.map).toEqual({ SKU9: 15000 });
    expect(result.skuCol).toBe("SKU");
    expect(result.hppCol).toBe("HPP");
    await expect(readHppFile(new File(["sku,hpp\nA,1\n"], "hpp.txt"))).rejects.toThrow("Format tidak didukung. Gunakan .xlsx atau .csv");
  });
});
