import type { CommissionView, ScoutItem } from "./types";

function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function scoutCsv(items: ScoutItem[], commissions: Record<string, CommissionView>): string {
  const header = ["nama", "harga", "terjual", "komisi", "rate_persen", "sumber", "link"];
  const rows = items.map((item) => {
    const commission = commissions[item.itemId];
    return [item.name, item.price, item.sold ?? "", commission?.amount ?? "", commission?.ratePct ?? "", commission?.source ?? "", item.url];
  });
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

export function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
