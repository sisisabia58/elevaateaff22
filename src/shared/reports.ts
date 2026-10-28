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

export type AdRow = { name: string; spend: number; gmv: number; orders: number };

export type ProfitSnapshot = {
  orders: number;
  cancelled: number;
  omzet: number;
  income: number;
  fees: number;
  adSpend: number;
  adGmv: number;
  roas: number;
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
  operasional?: number;
}): ProfitSnapshot {
  const active = input.orders.filter((row) => !row.cancelled && row.orderNo);
  const cancelled = input.orders.filter((row) => row.cancelled).length;
  const omzet = active.reduce((sum, row) => sum + row.price, 0);
  const flow = emptyFlow();
  for (const row of input.finance) {
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
  const reported = input.finance.reduce((sum, row) => sum + (row.income || 0), 0);
  const income = input.finance.length ? (components !== 0 ? flow.harga + components : reported) : omzet;
  const fees = input.finance.reduce((sum, row) => sum + row.fees, 0);
  const adSpend = input.ads.reduce((sum, row) => sum + row.spend, 0);
  const gmv = input.ads.reduce((sum, row) => sum + row.gmv, 0);
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
    hpp,
    operasional,
    profit: income - hpp - adSpend - operasional,
    flow,
    shortfalls,
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
