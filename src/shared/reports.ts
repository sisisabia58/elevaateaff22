export type ExportKind = "pesanan" | "keuangan" | "iklan" | "unknown";

export type OrderRow = {
  orderNo: string;
  sku: string;
  name: string;
  qty: number;
  price: number;
  shippingPaid: number;
  shippingCost: number;
  cancelled: boolean;
};

export type FinanceRow = {
  orderNo: string;
  productPrice: number;
  income: number;
  fees: number;
};

export type AdRow = { name: string; spend: number; gmv: number; orders: number };

export type ProfitSnapshot = {
  orders: number;
  cancelled: number;
  omzet: number;
  income: number;
  fees: number;
  adSpend: number;
  roas: number;
  hpp: number;
  profit: number;
  shortfalls: Array<{ orderNo: string; amount: number; claimed: boolean }>;
};

function norm(header: string): string {
  return header.toLowerCase().replace(/\s+/g, " ").trim();
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function detectExportKind(headers: string[]): ExportKind {
  const joined = headers.map(norm).join(" | ");
  if (joined.includes("biaya") && (joined.includes("omzet") || joined.includes("penjualan")) && !joined.includes("no. pesanan") && !joined.includes("nomor pesanan")) {
    return "iklan";
  }
  if (joined.includes("penghasilan") || joined.includes("dana dilepas")) return "keuangan";
  if (joined.includes("pesanan")) return "pesanan";
  return "unknown";
}

function col(headers: string[], ...names: string[]): number {
  const wanted = names.map(norm);
  return headers.findIndex((header) => wanted.some((name) => norm(header).includes(name)));
}

export function parseTable(headers: string[], rows: string[][]): {
  kind: ExportKind;
  orders: OrderRow[];
  finance: FinanceRow[];
  ads: AdRow[];
} {
  const kind = detectExportKind(headers);
  const orders: OrderRow[] = [];
  const finance: FinanceRow[] = [];
  const ads: AdRow[] = [];
  if (kind === "pesanan") {
    const no = col(headers, "no. pesanan", "nomor pesanan");
    const sku = col(headers, "sku");
    const name = col(headers, "nama produk");
    const qty = col(headers, "jumlah");
    const price = col(headers, "harga produk", "harga");
    const paid = col(headers, "ongkir dibayar", "ongkos kirim dibayar");
    const cost = col(headers, "ongkir ke kurir", "ongkos kirim ke");
    const status = col(headers, "status");
    for (const row of rows) {
      orders.push({
        orderNo: row[no] || "",
        sku: row[sku] || "",
        name: row[name] || "",
        qty: num(row[qty]) || 1,
        price: num(row[price]),
        shippingPaid: num(row[paid]),
        shippingCost: num(row[cost]),
        cancelled: /batal/i.test(row[status] || ""),
      });
    }
  }
  if (kind === "keuangan") {
    const no = col(headers, "no. pesanan", "nomor pesanan");
    const price = col(headers, "harga produk");
    const income = col(headers, "total penghasilan", "penghasilan");
    const admin = col(headers, "biaya administrasi");
    const service = col(headers, "biaya layanan");
    for (const row of rows) {
      finance.push({
        orderNo: row[no] || "",
        productPrice: num(row[price]),
        income: num(row[income]),
        fees: num(row[admin]) + num(row[service]),
      });
    }
  }
  if (kind === "iklan") {
    const name = col(headers, "nama iklan", "nama produk");
    const spend = col(headers, "biaya");
    const gmv = col(headers, "omzet", "penjualan");
    const ordersCol = col(headers, "terjual", "konversi", "pesanan");
    for (const row of rows) {
      ads.push({ name: row[name] || "", spend: num(row[spend]), gmv: num(row[gmv]), orders: num(row[ordersCol]) });
    }
  }
  return { kind, orders, finance, ads };
}

export function snapshot(input: {
  orders: OrderRow[];
  finance: FinanceRow[];
  ads: AdRow[];
  hppBySku: Record<string, number>;
  claimed: string[];
}): ProfitSnapshot {
  const active = input.orders.filter((row) => !row.cancelled && row.orderNo);
  const cancelled = input.orders.filter((row) => row.cancelled).length;
  const omzet = active.reduce((sum, row) => sum + row.price, 0);
  const income = input.finance.reduce((sum, row) => sum + row.income, 0) || omzet;
  const fees = input.finance.reduce((sum, row) => sum + row.fees, 0);
  const adSpend = input.ads.reduce((sum, row) => sum + row.spend, 0);
  const gmv = input.ads.reduce((sum, row) => sum + row.gmv, 0);
  const hpp = active.reduce((sum, row) => sum + (input.hppBySku[row.sku] || 0) * (row.qty || 1), 0);
  const claimed = new Set(input.claimed);
  const shortfalls = active
    .map((row) => ({ orderNo: row.orderNo, amount: Math.max(0, row.shippingCost - row.shippingPaid), claimed: claimed.has(row.orderNo) }))
    .filter((row) => row.amount > 0);
  return {
    orders: active.length,
    cancelled,
    omzet,
    income,
    fees,
    adSpend,
    roas: adSpend > 0 ? gmv / adSpend : 0,
    hpp,
    profit: income - fees - hpp - adSpend,
    shortfalls,
  };
}

export function parseHppCsv(text: string): Record<string, number> {
  const table = parseCsv(text);
  if (!table.headers.length) return {};
  const headers = table.headers.map((header) => header.toLowerCase());
  let sku = headers.findIndex((header) => header.includes("sku"));
  const variant = headers.findIndex((header) => header.includes("varian") || header.includes("variant"));
  let hpp = headers.findIndex((header) => header.includes("hpp") || header.includes("modal"));
  let dataRows = table.rows;
  if (sku < 0 || hpp < 0) {
    sku = 0;
    hpp = variant === 1 ? 2 : 1;
    dataRows = [table.headers, ...table.rows];
  }
  const map: Record<string, number> = {};
  for (const row of dataRows) {
    const keySku = (row[sku] || "").trim();
    const keyVariant = variant >= 0 ? (row[variant] || "").trim() : "";
    const amount = num(row[hpp]);
    if (!keySku || !amount) continue;
    map[keyVariant ? `${keySku}|${keyVariant}` : keySku] = amount;
  }
  return map;
}

export function hppFor(map: Record<string, number>, sku: string, variant = ""): number {
  if (variant && map[`${sku}|${variant}`] != null) return map[`${sku}|${variant}`];
  return map[sku] ?? 0;
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const split = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else current += char;
    }
    cells.push(current.trim());
    return cells;
  };
  const [headerLine, ...rest] = lines;
  return { headers: headerLine ? split(headerLine) : [], rows: rest.map(split) };
}
