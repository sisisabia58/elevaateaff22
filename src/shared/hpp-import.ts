import * as XLSX from "xlsx";
import { importHppGrid, parseHppCsv, type HppImport } from "./reports";

/** Read a SENA HPP file: first sheet of .xlsx, or a comma/tab .csv. */
export async function readHppFile(file: File): Promise<HppImport> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx") {
    const book = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
    const sheet = book.Sheets[book.SheetNames[0] ?? ""];
    if (!sheet) throw new Error("File kosong atau tidak ada data");
    const grid = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, raw: false, defval: "" });
    const filled = grid.filter((row) => row.some((cell) => String(cell ?? "").trim()));
    if (filled.length < 2) throw new Error("File kosong atau tidak ada data");
    const [header, ...rows] = filled.map((row) => row.map((cell) => String(cell ?? "")));
    return importHppGrid(header, rows);
  }
  if (ext !== "csv") throw new Error("Format tidak didukung. Gunakan .xlsx atau .csv");
  return parseHppCsv(await file.text());
}
