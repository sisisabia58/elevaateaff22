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
  confirmedAt?: string | null;
  completedAt?: string | null;
  releasedAt?: string | null;
  store?: string | null;
  subtotal?: number | null;
  province?: string | null;
  payment?: string | null;
  shipping?: string | null;
  variant?: string | null;
};

export type DateBasis = "created" | "confirmed" | "completed" | "released";

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
  orderCreatedAt?: string | null;
  confirmedAt?: string | null;
  completedAt?: string | null;
  releasedAt?: string | null;
  store?: string | null;
};

export type Shortfall = { orderNo: string; amount: number; claimed: boolean; store: string; date: string | null };

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

export type AdRow = {
  name: string;
  spend: number;
  gmv: number;
  orders: number;
  periodFrom?: string | null;
  periodTo?: string | null;
  store?: string | null;
  status?: string | null;
  mode?: string | null;
  clicks?: number | null;
  impressions?: number | null;
  roas?: number | null;
};

export type AdCampaign = {
  name: string;
  status: string;
  mode: string;
  spend: number;
  gmv: number;
  orders: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  prorated: boolean;
};

export type AdDetail = {
  spend: number;
  gmv: number;
  orders: number;
  clicks: number;
  roas: number;
  cpa: number;
  prorated: boolean;
  window: ProfitWindow | null;
  gapPeriods: ProfitWindow[];
  periodLabel: string | null;
  rows: AdCampaign[];
};

export type ProfitWindow = { from: string; to: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type ProfitSnapshot = {
  orders: number;
  cancelled: number;
  /** Unique non-cancelled order numbers. SENA pesananAktif. */
  activeOrders: number;
  /** Unique cancelled order numbers. SENA pesananBatal. */
  cancelledOrders: number;
  /** Filtered finance rows. SENA K.n, the Dana Dilepaskan chip. */
  released: number;
  /** A finance file is loaded, even when the current window has zero rows. */
  financeLoaded: boolean;
  omzet: number;
  income: number;
  fees: number;
  adSpend: number;
  iklan: number;
  iklanManual: boolean;
  adGmv: number;
  roas: number;
  prorated: boolean;
  campaigns: AdDetail;
  hpp: number;
  operasional: number;
  profit: number;
  flow: MoneyFlow;
  shortfalls: Shortfall[];
  charts: ProfitCharts;
  coverage: HppCoverage;
};

export type ProfitCharts = {
  daily: Array<{ date: string; label: string; omzet: number; orders: number }>;
  dailyLabel: string;
  fees: Array<{ label: string; amount: number }>;
  payments: Array<{ label: string; count: number }>;
  shipping: Array<{ label: string; count: number }>;
  provinces: Array<{ label: string; omzet: number; orders: number }>;
  products: Array<{ sku: string; name: string; omzet: number; qty: number; orders: number }>;
  orderCount: number;
  totalOmzet: number;
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

function plainNum(value: string | undefined): number {
  if (value == null || value === "") return 0;
  const parsed = parseFloat(String(value).trim().replace(/\s/g, ""));
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

export function peekStoreName(grid: string[][]): string | null {
  const scan = Math.min(grid.length, 40);
  for (let index = 0; index < scan; index += 1) {
    const cells = grid[index] || [];
    const label = (cells[0] || "").trim();
    if (/^nama toko$/i.test(label) || /^username(\s*\(penjual\))?$/i.test(label)) {
      const value = cells.slice(1).join(" ").trim();
      if (value) return value;
    }
  }
  return null;
}

export function locateExport(grid: string[][]): { headers: string[]; rows: string[][]; adFrom: string | null; adTo: string | null; adPeriod: string | null; store: string | null } {
  let adFrom: string | null = null;
  let adTo: string | null = null;
  let adPeriod: string | null = null;
  let headerIndex = 0;
  const store = peekStoreName(grid);
  const scan = Math.min(grid.length, 40);
  for (let index = 0; index < scan; index += 1) {
    const cells = grid[index] || [];
    const label = (cells[0] || "").trim().toLowerCase();
    if (label === "periode" || label.startsWith("periode")) {
      const raw = cells.slice(1).map((cell) => cell ?? "").join(",").trim();
      adPeriod = raw || null;
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
  return { headers: grid[headerIndex] || [], rows: grid.slice(headerIndex + 1), adFrom, adTo, adPeriod, store };
}

export function parseExportGrid(grid: string[][]): {
  kind: ExportKind;
  store: string;
  shop: string | null;
  adPeriod: string | null;
  orders: OrderRow[];
  finance: FinanceRow[];
  ads: AdRow[];
} {
  const located = locateExport(grid);
  const parsed = parseTable(located.headers, located.rows, { from: located.adFrom, to: located.adTo });
  const store = located.store || "Default";
  return {
    ...parsed,
    store,
    shop: located.store,
    adPeriod: located.adPeriod,
    orders: parsed.orders.map((row) => ({ ...row, store })),
    finance: parsed.finance.map((row) => ({ ...row, store })),
    ads: parsed.ads.map((row) => ({ ...row, store })),
  };
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
    const subtotal = col(headers, "subtotal pesanan");
    const province = col(headers, "provinsi");
    const payment = col(headers, "metode pembayaran");
    const shipping = col(headers, "opsi pengiriman");
    const variant = col(headers, "nama variasi", "nama varian");
    const paid = col(headers, "ongkir dibayar", "ongkos kirim dibayar");
    const cost = col(headers, "ongkir ke kurir", "ongkos kirim ke");
    const status = col(headers, "status");
    const created = col(headers, "waktu pesanan dibuat");
    const confirmed = col(headers, "waktu pesanan dikonfirmasi");
    const completed = col(headers, "waktu pesanan selesai");
    for (const row of rows) {
      orders.push({
        orderNo: row[no] || "",
        sku: row[sku] || "",
        name: row[name] || "",
        qty: num(row[qty]) || 1,
        price: num(row[price]),
        subtotal: subtotal >= 0 ? num(row[subtotal]) : null,
        province: province >= 0 ? row[province] || "" : null,
        payment: payment >= 0 ? row[payment] || "" : null,
        shipping: shipping >= 0 ? row[shipping] || "" : null,
        variant: variant >= 0 ? row[variant] || "" : null,
        shippingPaid: num(row[paid]),
        shippingCost: num(row[cost]),
        cancelled: /batal/i.test(row[status] || ""),
        createdAt: parseShopeeDate(row[created]),
        confirmedAt: parseShopeeDate(row[confirmed]),
        completedAt: parseShopeeDate(row[completed]),
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
    const orderCreated = col(headers, "waktu pesanan dibuat");
    const confirmed = col(headers, "waktu pesanan dikonfirmasi");
    const completed = col(headers, "waktu pesanan selesai");
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
      const releasedAt = parseShopeeDate(row[released]);
      finance.push({
        orderNo: row[no] || "",
        productPrice: harga,
        harga,
        income: components !== 0 ? harga + components : reported || harga,
        fees: parts.admin + parts.proses + parts.xtra + parts.layanan + parts.ams + parts.kampanye + parts.lainnya,
        ...parts,
        createdAt: releasedAt,
        releasedAt,
        orderCreatedAt: parseShopeeDate(row[orderCreated]),
        confirmedAt: parseShopeeDate(row[confirmed]),
        completedAt: parseShopeeDate(row[completed]),
      });
    }
  }
  if (kind === "iklan") {
    const name = col(headers, "nama iklan", "nama produk");
    const spend = col(headers, "biaya");
    const gmv = col(headers, "omzet", "penjualan");
    const ordersCol = col(headers, "terjual", "konversi", "pesanan");
    const status = col(headers, "status");
    const mode = col(headers, "mode bidding", "mode");
    const clicks = col(headers, "jumlah klik");
    const impressions = col(headers, "dilihat", "impresi", "impression");
    const roas = col(headers, "efektifitas iklan", "efektivitas iklan", "roas");
    for (const row of rows) {
      ads.push({
        name: row[name] || "",
        spend: num(row[spend]),
        gmv: num(row[gmv]),
        orders: num(row[ordersCol]),
        status: status >= 0 ? row[status] || "" : "",
        mode: mode >= 0 ? row[mode] || "" : "",
        clicks: clicks >= 0 ? num(row[clicks]) : 0,
        impressions: impressions >= 0 ? num(row[impressions]) : 0,
        roas: roas >= 0 ? plainNum(row[roas]) : 0,
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
  iklan?: number;
  iklanManual?: boolean;
  period?: string | null;
  range?: ProfitWindow | null;
  basis?: DateBasis;
  storeFilter?: string[] | null;
}): ProfitSnapshot {
  const window = input.range?.from && input.range?.to ? input.range : input.period ? monthWindow(input.period) : null;
  const basis = input.basis || "created";
  const scoped = applyBasis(
    rowsForStores(input.orders, input.storeFilter),
    rowsForStores(input.finance, input.storeFilter),
    basis,
    window,
  );
  const orders = scoped.orders;
  const finance = scoped.finance;
  const active = orders.filter((row) => !row.cancelled && row.orderNo);
  const cancelledRows = orders.filter((row) => row.cancelled);
  const cancelled = cancelledRows.length;
  const activeOrders = new Set(active.map((row) => row.orderNo)).size;
  const cancelledOrders = new Set(cancelledRows.map((row) => row.orderNo)).size;
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
  for (const row of rowsForStores(input.ads, input.storeFilter)) {
    const fraction = adFraction(row, window);
    if (fraction <= 0) continue;
    if (fraction < 1) prorated = true;
    adSpend += row.spend * fraction;
    gmv += row.gmv * fraction;
  }
  const hpp = active.reduce((sum, row) => sum + (input.hppBySku[hppKey(row)] || 0) * (row.qty || 1), 0);
  const operasional = input.operasional || 0;
  const iklanManual = Boolean(input.iklanManual);
  const iklan = iklanManual ? Number(input.iklan) || 0 : adSpend > 0 ? Math.round(adSpend) : 0;
  const claimed = new Set(input.claimed);
  const shortfalls = finance
    .filter((row) => (row.pengiriman || 0) < 0 && row.orderNo)
    .map((row) => ({
      orderNo: row.orderNo,
      amount: row.pengiriman || 0,
      claimed: claimed.has(row.orderNo),
      store: row.store || "",
      date: shortfallDate(row, basis),
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.orderNo.localeCompare(b.orderNo));
  return {
    orders: active.length,
    cancelled,
    activeOrders,
    cancelledOrders,
    released: finance.length,
    financeLoaded: input.finance.length > 0,
    omzet,
    income,
    fees,
    adSpend,
    iklan,
    iklanManual,
    adGmv: gmv,
    roas: adSpend > 0 ? gmv / adSpend : 0,
    prorated,
    hpp,
    operasional,
    profit: income - hpp - iklan - operasional,
    flow,
    shortfalls,
    charts: profitCharts(active, flow),
    campaigns: adCampaigns(input.ads, window, input.storeFilter),
    coverage: hppCoverage(active, finance, input.hppBySku),
  };
}

function shortfallDate(row: FinanceRow, basis: DateBasis): string | null {
  const created = row.orderCreatedAt || null;
  if (basis === "confirmed") return row.confirmedAt || created;
  if (basis === "completed") return row.completedAt || created;
  if (basis === "released") return row.releasedAt || row.createdAt || created;
  return created;
}

export function shippingClass(option: string): string {
  if (option.includes("Hemat")) return "SPX Hemat";
  if (option.includes("Instant") || option.includes("Same Day")) return "Instant/Same Day";
  if (option.includes("Standard") || option.includes("Reguler")) return "SPX Standard";
  if (option.includes("Kargo")) return "SPX Kargo";
  return "Lainnya";
}

export function profitCharts(orders: OrderRow[], flow: MoneyFlow): ProfitCharts {
  const byOrder = new Map<string, { subtotal: number; date: string | null; province: string; payment: string; shipping: string }>();
  const products = new Map<string, { sku: string; name: string; omzet: number; qty: number; orders: Set<string> }>();
  for (const row of orders) {
    if (!row.orderNo) continue;
    const current = byOrder.get(row.orderNo) || {
      subtotal: 0,
      date: row.createdAt || null,
      province: row.province || "",
      payment: row.payment || "",
      shipping: row.shipping || "",
    };
    current.subtotal += row.subtotal ?? row.price;
    if (!current.date && row.createdAt) current.date = row.createdAt;
    if (!current.province && row.province) current.province = row.province;
    if (!current.payment && row.payment) current.payment = row.payment;
    if (!current.shipping && row.shipping) current.shipping = row.shipping;
    byOrder.set(row.orderNo, current);
    const sku = row.sku || row.name || row.orderNo;
    const product = products.get(sku) || { sku, name: row.name, omzet: 0, qty: 0, orders: new Set<string>() };
    product.omzet += row.subtotal ?? row.price;
    product.qty += row.qty || 1;
    product.orders.add(row.orderNo);
    if (row.name) product.name = row.name.length > 56 ? `${row.name.slice(0, 56)}…` : row.name;
    products.set(sku, product);
  }
  const dailyMap = new Map<string, { omzet: number; orders: number }>();
  const provinces = new Map<string, { omzet: number; orders: number }>();
  const payments = new Map<string, number>();
  const shipping = new Map<string, number>();
  for (const order of byOrder.values()) {
    if (order.date) {
      const day = dailyMap.get(order.date) || { omzet: 0, orders: 0 };
      day.omzet += order.subtotal;
      day.orders += 1;
      dailyMap.set(order.date, day);
    }
    const province = order.province || "Lainnya";
    const prov = provinces.get(province) || { omzet: 0, orders: 0 };
    prov.omzet += order.subtotal;
    prov.orders += 1;
    provinces.set(province, prov);
    const payment = order.payment || "Lainnya";
    payments.set(payment, (payments.get(payment) || 0) + 1);
    const courier = shippingClass(order.shipping || "");
    shipping.set(courier, (shipping.get(courier) || 0) + 1);
  }
  const daily = [...dailyMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, omzet: value.omzet, orders: value.orders }));
  const fees = [
    { label: "Biaya Admin", amount: Math.abs(flow.admin) },
    { label: "Biaya Layanan", amount: Math.abs(flow.layanan) },
    { label: "Biaya Proses", amount: Math.abs(flow.proses) },
    { label: "Biaya Pengiriman", amount: Math.abs(flow.pengiriman) },
    { label: "Komisi AMS", amount: Math.abs(flow.ams) },
    { label: "Biaya XTRA", amount: Math.abs(flow.xtra) },
    { label: "Lainnya", amount: Math.abs(flow.lainnya) + Math.abs(flow.kampanye) },
  ].filter((item) => item.amount > 0);
  return {
    daily,
    dailyLabel: daily.length ? `${daily[0].date} s/d ${daily[daily.length - 1].date}` : "—",
    fees,
    payments: [...payments.entries()].sort((left, right) => right[1] - left[1]).slice(0, 8).map(([label, count]) => ({ label, count })),
    shipping: [...shipping.entries()].sort((left, right) => right[1] - left[1]).map(([label, count]) => ({ label, count })),
    provinces: [...provinces.entries()]
      .sort((left, right) => right[1].omzet - left[1].omzet)
      .slice(0, 10)
      .map(([label, value]) => ({ label, omzet: value.omzet, orders: value.orders })),
    products: [...products.values()]
      .sort((left, right) => right.omzet - left.omzet)
      .map((product) => ({ sku: product.sku, name: product.name, omzet: product.omzet, qty: product.qty, orders: product.orders.size })),
    orderCount: byOrder.size,
    totalOmzet: [...byOrder.values()].reduce((sum, order) => sum + order.subtotal, 0),
  };
}

export type HppCoverage = { total: number; missing: number; text: string; tone: "empty" | "ok" | "warn" };

/** SENA updateHppSummary: finance narrows the SKU set to orders that also appear in the income report. */
export function hppCoverage(orders: OrderRow[], finance: FinanceRow[], hppBySku: Record<string, number>): HppCoverage {
  const financeIds = new Set(finance.map((row) => row.orderNo).filter(Boolean));
  const rows = finance.length ? orders.filter((row) => financeIds.has(row.orderNo)) : orders;
  const skus = new Set(rows.filter((row) => !row.cancelled).map((row) => hppKey(row)));
  if (!skus.size) return { total: 0, missing: 0, text: "Belum ada data pesanan di periode ini.", tone: "empty" };
  let missing = 0;
  for (const sku of skus) if (!hppBySku[sku]) missing += 1;
  if (!missing) return { total: skus.size, missing: 0, text: `Semua ${skus.size} SKU di periode ini udah diisi HPP.`, tone: "ok" };
  return { total: skus.size, missing, text: `${missing} dari ${skus.size} SKU di periode ini belum diisi HPP -- profit belum akurat.`, tone: "warn" };
}

export function monthWindow(period: string): ProfitWindow {
  const [year, month] = period.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, "0")}` };
}

/** SENA flow row: abs(amount) / harga produk, one decimal. Hidden when the base is zero. */
export function flowShare(value: number, base: number): string | null {
  if (!base) return null;
  return `${((Math.abs(value) / base) * 100).toFixed(1)}%`;
}

export function periodLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1] || period} ${year}`;
}

function fmtDateShort(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

/** SENA renderHeader: selected window, then the ads file's own Periode line when any ads are loaded. */
export function headerPeriod(input: { period?: string | null; range?: ProfitWindow | null; ads?: number; adPeriod?: string | null }): string {
  const range = input.range?.from && input.range?.to ? input.range : null;
  const periodStr = range
    ? `${fmtDateShort(range.from)}/${range.from.slice(0, 4)} – ${fmtDateShort(range.to)}/${range.to.slice(0, 4)}`
    : input.period
      ? periodLabel(input.period)
      : "Semua Periode";
  if (!input.ads) return periodStr;
  return `${periodStr} · Iklan: ${input.adPeriod || "—"}`;
}

export function listPeriods(orders: OrderRow[], finance: FinanceRow[], basis: DateBasis = "created", storeFilter?: string[] | null): string[] {
  const months = new Set<string>();
  for (const row of rowsForStores(orders, storeFilter)) {
    const date = orderBasisDate(row, basis);
    if (date) months.add(date.slice(0, 7));
  }
  for (const row of rowsForStores(finance, storeFilter)) {
    const date = financeBasisDate(row, basis);
    if (date) months.add(date.slice(0, 7));
  }
  return [...months].sort().reverse();
}

export function dateBasisWarning(orders: OrderRow[], finance: FinanceRow[], basis: DateBasis, storeFilter?: string[] | null): string | null {
  orders = rowsForStores(orders, storeFilter);
  finance = rowsForStores(finance, storeFilter);
  if (basis === "created") return null;
  const ordersHave = orders.some((row) => orderHasBasis(row, basis));
  const financeHave = finance.some((row) => financeHasBasis(row, basis));
  if (ordersHave && !financeHave && finance.length) {
    return "⚠️ Kolom ini tidak ada di Laporan Keuangan — data Income/Biaya Shopee otomatis dicocokkan lewat No. Pesanan dari Laporan Pesanan yang lolos filter";
  }
  if (financeHave && !ordersHave && orders.length) {
    return "⚠️ Kolom ini tidak ada di Laporan Pesanan — data pesanan otomatis dicocokkan lewat No. Pesanan dari Laporan Keuangan yang lolos filter";
  }
  if (!ordersHave && !financeHave && (orders.length || finance.length)) {
    return "⚠️ Kolom ini tidak ada di file yang diupload — pakai Waktu Pesanan Dibuat sebagai gantinya";
  }
  return null;
}

function orderHasBasis(row: OrderRow, basis: DateBasis): boolean {
  if (basis === "confirmed") return Boolean(row.confirmedAt);
  if (basis === "completed") return Boolean(row.completedAt);
  if (basis === "released") return Boolean(row.releasedAt);
  return Boolean(row.createdAt);
}

function financeHasBasis(row: FinanceRow, basis: DateBasis): boolean {
  if (basis === "confirmed") return Boolean(row.confirmedAt);
  if (basis === "completed") return Boolean(row.completedAt);
  if (basis === "released") return Boolean(row.releasedAt || row.createdAt);
  return Boolean(row.orderCreatedAt);
}

function orderBasisDate(row: OrderRow, basis: DateBasis): string | null {
  if (basis === "confirmed") return row.confirmedAt || row.createdAt || null;
  if (basis === "completed") return row.completedAt || row.createdAt || null;
  if (basis === "released") return row.releasedAt || row.createdAt || null;
  return row.createdAt || null;
}

function financeBasisDate(row: FinanceRow, basis: DateBasis): string | null {
  if (basis === "released") return row.releasedAt || row.createdAt || row.orderCreatedAt || null;
  if (basis === "confirmed") return row.confirmedAt || row.orderCreatedAt || null;
  if (basis === "completed") return row.completedAt || row.orderCreatedAt || null;
  return row.orderCreatedAt || null;
}

function applyBasis(orders: OrderRow[], finance: FinanceRow[], basis: DateBasis, window: ProfitWindow | null): { orders: OrderRow[]; finance: FinanceRow[] } {
  if (!window) return { orders, finance };
  const ordersHave = orders.some((row) => orderHasBasis(row, basis));
  const financeHave = finance.some((row) => financeHasBasis(row, basis));
  if (ordersHave && !financeHave && finance.length) {
    const nextOrders = orders.filter((row) => inWindow(orderBasisDate(row, basis), window));
    const ids = new Set(nextOrders.map((row) => row.orderNo).filter(Boolean));
    return { orders: nextOrders, finance: finance.filter((row) => ids.has(row.orderNo)) };
  }
  if (financeHave && !ordersHave && orders.length) {
    const nextFinance = finance.filter((row) => inWindow(financeBasisDate(row, basis), window));
    const ids = new Set(nextFinance.map((row) => row.orderNo).filter(Boolean));
    return { orders: orders.filter((row) => ids.has(row.orderNo)), finance: nextFinance };
  }
  return {
    orders: orders.filter((row) => inWindow(orderBasisDate(row, basis), window)),
    finance: finance.filter((row) => inWindow(financeBasisDate(row, basis), window)),
  };
}

export function listStores(orders: OrderRow[], finance: FinanceRow[], ads: AdRow[]): string[] {
  const stores = new Set<string>();
  for (const row of [...orders, ...finance, ...ads]) if (row.store) stores.add(row.store);
  return [...stores].sort((left, right) => left.localeCompare(right, "id"));
}

export function rowsForStores<T extends { store?: string | null }>(rows: T[], storeFilter?: string[] | null): T[] {
  if (storeFilter == null) return rows;
  return rows.filter((row) => storeFilter.includes(row.store || "Default"));
}

export function toggleStore(name: string, stores: string[], selected: string[] | null): string[] | null {
  const current = selected ?? stores;
  const next = current.includes(name) ? current.filter((store) => store !== name) : [...current, name];
  if (next.length === 0) return [];
  if (next.length >= stores.length) return null;
  return next;
}

export function mergeStoreRows<T extends { store?: string | null }>(existing: T[], incoming: T[], store: string): T[] {
  return [...existing.filter((row) => (row.store || "Default") !== store), ...incoming.map((row) => ({ ...row, store }))];
}

export type UpsertCounts = { added: number; updated: number };

function orderImportKey(row: OrderRow): string {
  return `${row.orderNo || ""}||${(row.sku || "").trim() || row.name || ""}`;
}

/** SENA keeps every order key and counts a repeat No. Pesanan + SKU as an update. */
export function upsertOrders(existing: OrderRow[], incoming: OrderRow[], store: string): { rows: OrderRow[] } & UpsertCounts {
  const map = new Map(existing.map((row) => [orderImportKey(row), row]));
  let added = 0;
  let updated = 0;
  incoming.forEach((row, index) => {
    const identity = orderImportKey(row);
    const key = identity === "||" ? `||${index}` : identity;
    if (map.has(key)) updated += 1;
    else added += 1;
    map.set(key, { ...row, store });
  });
  return { rows: [...map.values()], added, updated };
}

/** SENA finance key is No. Pesanan. A new file updates that order and leaves the others. */
export function upsertFinance(existing: FinanceRow[], incoming: FinanceRow[], store: string): { rows: FinanceRow[] } & UpsertCounts {
  const map = new Map(existing.map((row, index) => [row.orderNo || `row-${index}`, row]));
  let added = 0;
  let updated = 0;
  incoming.forEach((row, index) => {
    const key = row.orderNo || `row-${index}`;
    if (map.has(key)) updated += 1;
    else added += 1;
    map.set(key, { ...row, store });
  });
  return { rows: [...map.values()], added, updated };
}

/** SENA ad key is name + store + period start, so a second month does not erase the first. */
export function upsertAds(existing: AdRow[], incoming: AdRow[], store: string): { rows: AdRow[] } & UpsertCounts {
  const keyOf = (row: AdRow, rowStore: string) => `${row.name || ""}||${rowStore || "Default"}||${row.periodFrom || "unknown"}`;
  const map = new Map(existing.map((row) => [keyOf(row, row.store || "Default"), row]));
  let added = 0;
  let updated = 0;
  for (const row of incoming) {
    const key = keyOf(row, store);
    if (map.has(key)) updated += 1;
    else added += 1;
    map.set(key, { ...row, store });
  }
  return { rows: [...map.values()], added, updated };
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

function fmtDateFull(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function adSignal(roas: number): "Untung" | "Waspada" | "Rugi" {
  if (roas >= 6) return "Untung";
  if (roas >= 3) return "Waspada";
  return "Rugi";
}

export function adChartLabel(name: string): string {
  return `${name.split(" ").slice(0, 3).join(" ")}…`;
}

export function clipAdName(name: string): string {
  return name.length > 55 ? `${name.slice(0, 55)}…` : name;
}

export function adCampaigns(ads: AdRow[], window: ProfitWindow | null, storeFilter?: string[] | null): AdDetail {
  const rows: AdCampaign[] = [];
  const gaps = new Map<string, ProfitWindow>();
  const periods = new Map<string, ProfitWindow>();
  let spend = 0;
  let gmv = 0;
  let orders = 0;
  let clicks = 0;
  let prorated = false;
  for (const ad of rowsForStores(ads, storeFilter)) {
    const fraction = adFraction(ad, window);
    if (fraction <= 0) continue;
    if (ad.periodFrom && ad.periodTo) periods.set(`${ad.periodFrom}|${ad.periodTo}`, { from: ad.periodFrom, to: ad.periodTo });
    if (fraction < 1 && ad.periodFrom && ad.periodTo) {
      prorated = true;
      gaps.set(`${ad.periodFrom}|${ad.periodTo}`, { from: ad.periodFrom, to: ad.periodTo });
    }
    const biaya = ad.spend * fraction;
    const omzet = ad.gmv * fraction;
    const konv = ad.orders * fraction;
    const klik = (ad.clicks || 0) * fraction;
    spend += biaya;
    gmv += omzet;
    orders += konv;
    clicks += klik;
    rows.push({
      name: ad.name || "",
      status: ad.status || "",
      mode: ad.mode || "",
      spend: biaya,
      gmv: omzet,
      orders: konv,
      clicks: klik,
      impressions: (ad.impressions || 0) * fraction,
      roas: ad.roas || 0,
      cpa: konv > 0 ? biaya / konv : 0,
      prorated: fraction < 1,
    });
  }
  return {
    spend,
    gmv,
    orders,
    clicks,
    roas: spend > 0 ? gmv / spend : 0,
    cpa: orders > 0 ? spend / orders : 0,
    prorated,
    window,
    gapPeriods: [...gaps.values()],
    periodLabel: [...periods.values()].map((period) => `${fmtDateFull(period.from)}–${fmtDateFull(period.to)}`).join(", ") || null,
    rows,
  };
}

export function adGapNote(detail: AdDetail): string | null {
  if (!detail.prorated || !detail.window) return null;
  const win = `${fmtDateFull(detail.window.from)}–${fmtDateFull(detail.window.to)}`;
  const reports = detail.gapPeriods.map((period) => `${fmtDateFull(period.from)}–${fmtDateFull(period.to)}`).join(", ");
  return `Laporan iklan khusus periode ${win} belum diupload. Angka Biaya Iklan di atas adalah estimasi prorata (dibagi rata per hari) dari laporan yang tersedia untuk ${reports}. Untuk hasil yang akurat, export "Semua Laporan Iklan CPC" dari Shopee Ads Center khusus periode ${win}, lalu upload di sini.`;
}

export type HppLine = { sku: string; name: string; product: string; variant: string; qty: number; hpp: number };

export function hppKey(row: { sku?: string | null; name?: string | null; variant?: string | null }): string {
  const sku = (row.sku || "").trim();
  if (sku) return sku;
  const variant = (row.variant || "").trim();
  const name = (row.name || "").trim();
  const display = variant ? `${name} • ${variant}` : name;
  return display ? `NOSKU::${display}` : "Unknown";
}

export function skuDisplayLabel(sku: string): string {
  return sku.startsWith("NOSKU::") ? "Belum ada SKU" : sku;
}

export function hppLines(orders: OrderRow[], hpp: Record<string, number>): HppLine[] {
  const map = new Map<string, HppLine>();
  for (const row of orders) {
    if (row.cancelled) continue;
    const key = hppKey(row);
    if (key === "Unknown") continue;
    const current = map.get(key) || { sku: key, name: row.name, product: row.name, variant: row.variant || "", qty: 0, hpp: hpp[key] || 0 };
    current.qty += row.qty || 1;
    if (row.name) {
      current.name = row.name;
      current.product = row.name;
    }
    if (!current.variant && row.variant) current.variant = row.variant;
    current.hpp = hpp[key] || 0;
    map.set(key, current);
  }
  return [...map.values()];
}

export type HppMasterRow =
  | { kind: "group"; product: string; count: number; qty: number; filled: number; totalHpp: number; collapsed: boolean }
  | { kind: "sku"; line: HppLine; rowNum: number; indent: boolean; siblings: string[] };

export function hppMaster(
  lines: HppLine[],
  options: { query?: string; onlyMissing?: boolean; collapsed?: Record<string, boolean | undefined> } = {},
): { rows: HppMasterRow[]; totalQty: number; totalHpp: number; groups: Record<string, string[]> } {
  const query = (options.query || "").trim().toLowerCase();
  const onlyMissing = Boolean(options.onlyMissing);
  const filtering = Boolean(query) || onlyMissing;
  const groups: Record<string, string[]> = {};
  const bySku = new Map(lines.map((line) => [line.sku, line]));
  for (const line of lines) {
    if (!line.product) continue;
    (groups[line.product] ||= []).push(line.sku);
  }
  for (const product of Object.keys(groups)) {
    if (groups[product].length < 2) delete groups[product];
  }
  const filled = (sku: string) => (bySku.get(sku)?.hpp || 0) > 0;
  let entries = [...lines];
  if (query) {
    entries = entries.filter((line) =>
      line.sku.toLowerCase().includes(query) || line.product.toLowerCase().includes(query) || line.variant.toLowerCase().includes(query),
    );
  }
  if (onlyMissing) entries = entries.filter((line) => !filled(line.sku));
  entries.sort((a, b) => {
    const byProduct = a.product.toLowerCase().localeCompare(b.product.toLowerCase(), "id");
    return byProduct || a.variant.toLowerCase().localeCompare(b.variant.toLowerCase(), "id");
  });
  const rows: HppMasterRow[] = [];
  let rowNum = 0;
  for (let index = 0; index < entries.length; ) {
    const product = entries[index].product;
    let next = index + 1;
    while (next < entries.length && product && entries[next].product === product) next += 1;
    const run = entries.slice(index, next);
    index = next;
    if (run.length === 1) {
      rowNum += 1;
      rows.push({ kind: "sku", line: run[0], rowNum, indent: false, siblings: groups[product] || [] });
      continue;
    }
    const siblings = groups[product] || run.map((line) => line.sku);
    const collapsed = !filtering && (options.collapsed?.[product] ?? siblings.every(filled));
    const totalQty = run.reduce((sum, line) => sum + line.qty, 0);
    const filledCount = run.filter((line) => filled(line.sku)).length;
    rows.push({
      kind: "group",
      product,
      count: run.length,
      qty: totalQty,
      filled: filledCount,
      totalHpp: run.reduce((sum, line) => sum + line.hpp * line.qty, 0),
      collapsed,
    });
    if (collapsed) {
      rowNum += run.length;
      continue;
    }
    for (const line of run) {
      rowNum += 1;
      rows.push({ kind: "sku", line, rowNum, indent: true, siblings });
    }
  }
  return {
    rows,
    totalQty: entries.reduce((sum, line) => sum + line.qty, 0),
    totalHpp: entries.reduce((sum, line) => sum + line.hpp * line.qty, 0),
    groups,
  };
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
      {
        orderNo: "A1",
        sku: "SKU1",
        name: "Tumbler",
        qty: 2,
        price: 100_000,
        shippingPaid: 0,
        shippingCost: 0,
        cancelled: false,
        createdAt: "2026-10-15",
        confirmedAt: "2026-11-01",
        completedAt: "2026-11-02",
        subtotal: 100_000,
        province: "DKI Jakarta",
        payment: "ShopeePay",
        shipping: "Hemat",
      },
      {
        orderNo: "B1",
        sku: "SKU2",
        name: "Sedotan",
        qty: 1,
        price: 20_000,
        shippingPaid: 0,
        shippingCost: 0,
        cancelled: false,
        createdAt: "2026-09-10",
        confirmedAt: "2026-09-11",
        completedAt: "2026-09-20",
        subtotal: 20_000,
        province: "Jawa Barat",
        payment: "COD",
        shipping: "Reguler",
      },
    ],
    finance: [
      ...base.finance.map((row) => ({ ...row, createdAt: "2026-10-15", releasedAt: "2026-11-05" })),
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
        releasedAt: "2026-09-15",
      },
    ],
    ads: [{
      name: "Tumbler",
      spend: 10_000,
      gmv: 40_000,
      orders: 2,
      clicks: 120,
      impressions: 3000,
      status: "Berjalan",
      mode: "Iklan Otomatis",
      roas: 4,
      periodFrom: "2026-10-01",
      periodTo: "2026-10-28",
    }],
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

export type HppImport = { map: Record<string, number>; skuCol: string; hppCol: string; imported: number };

/** SENA parseNum for an HPP cell: dots are thousands separators unless a comma sets the decimal. */
export function parseHppAmount(value: string | number | undefined | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const text = String(value).trim().replace(/\s/g, "");
  const parts = text.split(",");
  if (parts.length === 2) return parseFloat(parts[0].replace(/\./g, "") + "." + parts[1]) || 0;
  return parseFloat(text.replace(/\./g, "")) || 0;
}

/** SENA onHppFileImport column pick: SKU (or Kode Produk), then a column that starts with HPP or Harga Pokok. */
export function importHppGrid(headers: string[], rows: string[][]): HppImport {
  if (!headers.length || !rows.length) throw new Error("File kosong atau tidak ada data");
  const clean = headers.map((header) => header.replace(/^\uFEFF/, "").trim());
  const skuIdx = clean.findIndex((header) => /^sku$/i.test(header) || /sku.*(induk|kode|id|seller)/i.test(header) || /^(kode|kode.produk)$/i.test(header));
  const hppIdx = clean.findIndex((header) => /^hpp/i.test(header) || /harga.pokok/i.test(header) || /^(hpp.*unit|unit.*hpp|hpp.per.unit)$/i.test(header));
  const skuCol = skuIdx >= 0 ? skuIdx : 0;
  const hppCol = hppIdx >= 0 ? hppIdx : 1;
  const map: Record<string, number> = {};
  let imported = 0;
  for (const row of rows) {
    const sku = String(row[skuCol] ?? "").trim();
    const hpp = parseHppAmount(row[hppCol]);
    if (!sku || hpp <= 0) continue;
    map[sku] = hpp;
    imported += 1;
  }
  return { map, skuCol: clean[skuCol] ?? "", hppCol: clean[hppCol] ?? "", imported };
}

export function hppImportMessage(result: HppImport): string {
  return `${result.imported} SKU berhasil diimport. Kolom SKU: "${result.skuCol}", kolom HPP: "${result.hppCol}"`;
}

export function hppImportFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `Gagal import HPP: ${message}\n\nPastikan file memiliki kolom SKU dan HPP/unit.`;
}

export function parseHppCsv(text: string): HppImport {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error("File kosong atau tidak ada data");
  if (lines[0].includes("\t")) {
    const split = (line: string) => line.split("\t").map((cell) => cell.trim().replace(/^"|"$/g, "").replace(/^\uFEFF/, ""));
    const [header, ...rest] = lines;
    return importHppGrid(split(header), rest.map(split));
  }
  const table = parseCsv(cleaned);
  if (!table.rows.length) throw new Error("File kosong atau tidak ada data");
  return importHppGrid(table.headers, table.rows);
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
