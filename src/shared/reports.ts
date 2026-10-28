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
  createdAt?: string | null;
};

export type FinanceRow = {
  orderNo: string;
  productPrice: number;
  income: number;
  fees: number;
  harga?: number;
  admin?: number;
  proses?: number;
  xtra?: number;
  layanan?: number;
  ams?: number;
  kampanye?: number;
  lainnya?: number;
  pengiriman?: number;
  promoOngkir?: number;
  cashback?: number;
  refund?: number;
  kompensasi?: number;
  createdAt?: string | null;
};

export type MoneyFlow = {
  harga: number;
  admin: number;
  proses: number;
  xtra: number;
  layanan: number;
  ams: number;
  kampanye: number;
  lainnya: number;
  pengiriman: number;
  promoOngkir: number;
  cashback: number;
  refund: number;
  kompensasi: number;
};

export type AdRow = { name: string; spend: number; gmv: number; orders: number; periodFrom?: string | null; periodTo?: string | null };

export type ProfitWindow = { from: string; to: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type ProfitSnapshot = {
  orders: number;
  cancelled: number;
  omzet: number;
  income: number;
  fees: number;
  adSpend: number;
  adGmv: number;
  roas: number;
  prorated: boolean;
  hpp: number;
  operasional: number;
  profit: number;
  flow: MoneyFlow;
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
  if (
    joined.includes("penghasilan") ||
    joined.includes("dana dilepas") ||
    joined.includes("biaya administrasi") ||
    joined.includes("biaya proses pesanan") ||
    joined.includes("biaya komisi ams")
  ) {
    return "keuangan";
  }
  if (joined.includes("pesanan")) return "pesanan";
  return "unknown";
}

function col(headers: string[], ...names: string[]): number {
  const wanted = names.map(norm);
  return headers.findIndex((header) => wanted.some((name) => norm(header).includes(name)));
}

function matching(headers: string[], test: (header: string) => boolean): number[] {
  return headers.flatMap((header, index) => (test(norm(header)) ? [index] : []));
}

function sumAt(row: string[], indexes: number[]): number {
  return indexes.reduce((sum, index) => sum + num(row[index]), 0);
}

export function parseShopeeDate(value: string | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(text);
  if (!dmy) return null;
  return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
}

export function locateExport(grid: string[][]): { headers: string[]; rows: string[][]; adFrom: string | null; adTo: string | null } {
  let adFrom: string | null = null;
  let adTo: string | null = null;
  let headerIndex = 0;
  const scan = Math.min(grid.length, 40);
  for (let index = 0; index < scan; index += 1) {
    const cells = grid[index] || [];
    const label = (cells[0] || "").trim().toLowerCase();
    if (label === "periode" || label.startsWith("periode")) {
      const raw = cells.slice(1).join(" ");
      const dates = [...raw.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g)]
        .map((match) => parseShopeeDate(match[1]))
        .filter((date): date is string => Boolean(date));
      adFrom = dates[0] ?? null;
      adTo = dates[1] ?? dates[0] ?? null;
    }
    const joined = cells.map((cell) => cell.toLowerCase()).join(" | ");
    if (
      joined.includes("urutan") ||
      joined.includes("no. pesanan") ||
      joined.includes("nomor pesanan") ||
      (joined.includes("biaya") && (joined.includes("nama iklan") || joined.includes("nama produk")))
    ) {
      headerIndex = index;
      break;
    }
  }
  return { headers: grid[headerIndex] || [], rows: grid.slice(headerIndex + 1), adFrom, adTo };
}

export function parseExportGrid(grid: string[][]): {
  kind: ExportKind;
  orders: OrderRow[];
  finance: FinanceRow[];
  ads: AdRow[];
} {
  const located = locateExport(grid);
  return parseTable(located.headers, located.rows, { from: located.adFrom, to: located.adTo });
}

export function parseTable(headers: string[], rows: string[][], adPeriod?: { from: string | null; to: string | null }): {
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
    const created = col(headers, "waktu pesanan dibuat", "waktu pesanan dikonfirmasi", "waktu pesanan selesai");
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
        createdAt: parseShopeeDate(row[created]),
      });
    }
  }
  if (kind === "keuangan") {
    const no = col(headers, "no. pesanan", "nomor pesanan");
    const price = col(headers, "harga produk");
    const income = col(headers, "total penghasilan", "penghasilan");
    const admin = matching(headers, (header) => header.includes("biaya administrasi"));
    const proses = matching(headers, (header) => header.includes("biaya proses pesanan"));
    const xtra = matching(headers, (header) => /biaya gratis ongkir xtra/.test(header));
    const layanan = matching(headers, (header) => header.includes("biaya layanan"));
    const ams = matching(headers, (header) => header.includes("biaya komisi ams") || header.includes("ams service fee"));
    const kampanye = matching(headers, (header) => header.includes("biaya kampanye"));
    const lainnya = matching(headers, (header) => /fbs fee|pph 22|biaya transaksi|^biaya lainnya$|premi\b|program hemat|pre-order|isi saldo/.test(header));
    const ship = matching(headers, (header) =>
      /^ongkir dibayar pembeli$|ongkos kirim yang dibayarkan ke jasa kirim|diteruskan oleh shopee|potongan ongkos kirim dari jasa kirim|diskon ongkir ditanggung jasa kirim|gratis ongkir dari shopee|ongkos kirim pengembalian barang|return to seller fee|kembali ke biaya pengiriman|pengembalian biaya kirim/.test(header),
    );
    const promo = matching(headers, (header) => header.includes("promo gratis ongkir dari penjual"));
    const cashback = matching(headers, (header) => header.includes("cashback koin"));
    const refund = matching(headers, (header) => header.includes("pengembalian dana ke pembeli"));
    const kompensasi = matching(headers, (header) => header === "kompensasi" || header.includes("kompensasi"));
    const released = col(headers, "tanggal dana dilepaskan", "waktu pelepasan dana");
    for (const row of rows) {
      const harga = num(row[price]);
      const parts = {
        admin: sumAt(row, admin),
        proses: sumAt(row, proses),
        xtra: sumAt(row, xtra),
        layanan: sumAt(row, layanan),
        ams: sumAt(row, ams),
        kampanye: sumAt(row, kampanye),
        lainnya: sumAt(row, lainnya),
        pengiriman: sumAt(row, ship),
        promoOngkir: sumAt(row, promo),
        cashback: sumAt(row, cashback),
        refund: sumAt(row, refund),
        kompensasi: sumAt(row, kompensasi),
      };
      const components = Object.values(parts).reduce((sum, value) => sum + value, 0);
      const reported = num(row[income]);
      finance.push({
        orderNo: row[no] || "",
        productPrice: harga,
        harga,
        income: components !== 0 ? harga + components : reported || harga,
        fees: parts.admin + parts.proses + parts.xtra + parts.layanan + parts.ams + parts.kampanye + parts.lainnya,
        ...parts,
        createdAt: parseShopeeDate(row[released]),
      });
    }
  }
  if (kind === "iklan") {
    const name = col(headers, "nama iklan", "nama produk");
    const spend = col(headers, "biaya");
    const gmv = col(headers, "omzet", "penjualan");
    const ordersCol = col(headers, "terjual", "konversi", "pesanan");
    for (const row of rows) {
      ads.push({
        name: row[name] || "",
        spend: num(row[spend]),
        gmv: num(row[gmv]),
        orders: num(row[ordersCol]),
        periodFrom: adPeriod?.from ?? null,
        periodTo: adPeriod?.to ?? null,
      });
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
  operasional?: number;
  period?: string | null;
  range?: ProfitWindow | null;
}): ProfitSnapshot {
  const window = input.range?.from && input.range?.to ? input.range : input.period ? monthWindow(input.period) : null;
  const orderDate = new Map(input.orders.map((row) => [row.orderNo, row.createdAt || null]));
  const orders = input.orders.filter((row) => inWindow(row.createdAt, window));
  const finance = input.finance.filter((row) => inWindow(row.createdAt || orderDate.get(row.orderNo) || null, window));
  const active = orders.filter((row) => !row.cancelled && row.orderNo);
  const cancelled = orders.filter((row) => row.cancelled).length;
  const omzet = active.reduce((sum, row) => sum + row.price, 0);
  const flow = emptyFlow();
  for (const row of finance) {
    flow.harga += row.harga || row.productPrice || 0;
    flow.admin += row.admin || 0;
    flow.proses += row.proses || 0;
    flow.xtra += row.xtra || 0;
    flow.layanan += row.layanan || 0;
    flow.ams += row.ams || 0;
    flow.kampanye += row.kampanye || 0;
    flow.lainnya += row.lainnya || 0;
    flow.pengiriman += row.pengiriman || 0;
    flow.promoOngkir += row.promoOngkir || 0;
    flow.cashback += row.cashback || 0;
    flow.refund += row.refund || 0;
    flow.kompensasi += row.kompensasi || 0;
  }
  const components =
    flow.admin + flow.proses + flow.xtra + flow.layanan + flow.ams + flow.kampanye + flow.lainnya + flow.pengiriman + flow.promoOngkir + flow.cashback + flow.refund + flow.kompensasi;
  const reported = finance.reduce((sum, row) => sum + (row.income || 0), 0);
  const income = finance.length ? (components !== 0 ? flow.harga + components : reported) : omzet;
  const fees = finance.reduce((sum, row) => sum + row.fees, 0);
  let adSpend = 0;
  let gmv = 0;
  let prorated = false;
  for (const row of input.ads) {
    const fraction = adFraction(row, window);
    if (fraction <= 0) continue;
    if (fraction < 1) prorated = true;
    adSpend += row.spend * fraction;
    gmv += row.gmv * fraction;
  }
  const hpp = active.reduce((sum, row) => sum + (input.hppBySku[row.sku] || 0) * (row.qty || 1), 0);
  const operasional = input.operasional || 0;
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
    adGmv: gmv,
    roas: adSpend > 0 ? gmv / adSpend : 0,
    prorated,
    hpp,
    operasional,
    profit: income - hpp - adSpend - operasional,
    flow,
    shortfalls,
  };
}

export function monthWindow(period: string): ProfitWindow {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, "0")}` };
}

export function periodLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1] || period} ${year}`;
}

export function listPeriods(orders: OrderRow[], finance: FinanceRow[]): string[] {
  const months = new Set<string>();
  for (const row of orders) if (row.createdAt) months.add(row.createdAt.slice(0, 7));
  for (const row of finance) if (row.createdAt) months.add(row.createdAt.slice(0, 7));
  return [...months].sort().reverse();
}

function inWindow(date: string | null | undefined, window: ProfitWindow | null): boolean {
  if (!window) return true;
  return Boolean(date && date >= window.from && date <= window.to);
}

export function adFraction(ad: AdRow, window: ProfitWindow | null): number {
  if (!window || !ad.periodFrom || !ad.periodTo) return 1;
  if (ad.periodFrom > window.to || ad.periodTo < window.from) return 0;
  const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
  const overlapFrom = ad.periodFrom > window.from ? ad.periodFrom : window.from;
  const overlapTo = ad.periodTo < window.to ? ad.periodTo : window.to;
  const overlapDays = Math.max(0, Math.round((toMs(overlapTo) - toMs(overlapFrom)) / 86_400_000) + 1);
  const totalDays = Math.max(1, Math.round((toMs(ad.periodTo) - toMs(ad.periodFrom)) / 86_400_000) + 1);
  return Math.min(1, overlapDays / totalDays);
}

export type HppLine = { sku: string; name: string; qty: number; hpp: number };

export function hppLines(orders: OrderRow[], hpp: Record<string, number>): HppLine[] {
  const map = new Map<string, HppLine>();
  for (const row of orders) {
    if (!row.sku || row.cancelled) continue;
    const current = map.get(row.sku) || { sku: row.sku, name: row.name, qty: 0, hpp: hpp[row.sku] || 0 };
    current.qty += row.qty || 1;
    if (row.name) current.name = row.name;
    current.hpp = hpp[row.sku] || 0;
    map.set(row.sku, current);
  }
  return [...map.values()];
}

export function studioLedger(): { orders: OrderRow[]; finance: FinanceRow[]; ads: AdRow[] } {
  const base = parseTable(
    [
      "No. Pesanan",
      "Harga Produk",
      "Biaya Administrasi",
      "Biaya Proses Pesanan",
      "Biaya Gratis Ongkir XTRA",
      "Biaya Layanan",
      "Biaya Komisi AMS",
      "Biaya Kampanye",
      "Biaya Lainnya",
      "Ongkir Dibayar Pembeli",
      "Ongkos Kirim yang Dibayarkan ke Jasa Kirim",
      "Promo Gratis Ongkir dari Penjual",
      "Cashback Koin disponsori Penjual",
      "Kompensasi",
    ],
    [["A1", "100000", "-5000", "-2000", "-1000", "-1500", "-800", "-200", "-100", "4000", "-7000", "-1000", "-500", "200"]],
  );
  return {
    orders: [
      { orderNo: "A1", sku: "SKU1", name: "Tumbler", qty: 2, price: 100_000, shippingPaid: 0, shippingCost: 0, cancelled: false, createdAt: "2026-10-15" },
      { orderNo: "B1", sku: "SKU2", name: "Sedotan", qty: 1, price: 20_000, shippingPaid: 0, shippingCost: 0, cancelled: false, createdAt: "2026-09-10" },
    ],
    finance: [
      ...base.finance.map((row) => ({ ...row, createdAt: "2026-10-15" })),
      {
        orderNo: "B1",
        productPrice: 20_000,
        harga: 20_000,
        income: 19_000,
        fees: -1_000,
        admin: -1_000,
        proses: 0,
        xtra: 0,
        layanan: 0,
        ams: 0,
        kampanye: 0,
        lainnya: 0,
        pengiriman: 0,
        promoOngkir: 0,
        cashback: 0,
        refund: 0,
        kompensasi: 0,
        createdAt: "2026-09-10",
      },
    ],
    ads: [{ name: "Tumbler", spend: 10_000, gmv: 40_000, orders: 2, periodFrom: "2026-10-01", periodTo: "2026-10-28" }],
  };
}

function emptyFlow(): MoneyFlow {
  return { harga: 0, admin: 0, proses: 0, xtra: 0, layanan: 0, ams: 0, kampanye: 0, lainnya: 0, pengiriman: 0, promoOngkir: 0, cashback: 0, refund: 0, kompensasi: 0 };
}

export function demoProfitSnapshot(operasional = 0): ProfitSnapshot {
  const finance = parseTable(
    [
      "No. Pesanan",
      "Harga Produk",
      "Biaya Administrasi",
      "Biaya Proses Pesanan",
      "Biaya Gratis Ongkir XTRA",
      "Biaya Layanan",
      "Biaya Komisi AMS",
      "Biaya Kampanye",
      "Biaya Lainnya",
      "Ongkir Dibayar Pembeli",
      "Ongkos Kirim yang Dibayarkan ke Jasa Kirim",
      "Promo Gratis Ongkir dari Penjual",
      "Cashback Koin disponsori Penjual",
      "Kompensasi",
    ],
    [["A1", "100000", "-5000", "-2000", "-1000", "-1500", "-800", "-200", "-100", "4000", "-7000", "-1000", "-500", "200"]],
  );
  return snapshot({
    orders: [{ orderNo: "A1", sku: "SKU1", name: "Tumbler", qty: 2, price: 100000, shippingPaid: 0, shippingCost: 0, cancelled: false }],
    finance: finance.finance,
    ads: [{ name: "Tumbler", spend: 10000, gmv: 40000, orders: 2 }],
    hppBySku: { SKU1: 15000 },
    claimed: [],
    operasional,
  });
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
