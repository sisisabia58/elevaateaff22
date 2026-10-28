import { useMemo, useState } from "react";
import { downloadText } from "../shared/csv";
import { DIAGNOSIS_META, TIER_META, funnelCsv, tierRank, type ClassifiedProduct, type FunnelTierKey } from "../shared/funnel";
import { formatMoney, marketFromHost } from "../shared/money";
import { elevateCss } from "./css";

type SortKey = "priority" | "omzet" | "impressions" | "uv" | "ctr" | "addToCart" | "conv";

function blank(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return digits ? `${value.toFixed(digits)}%` : Math.round(value).toLocaleString("id-ID");
}

function thumb(image: string | null | undefined): string | null {
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  return `https://down-id.img.susercontent.com/${image}_tn`;
}

export function FunnelBoard({ rows, note }: { rows: ClassifiedProduct[]; note?: string }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<FunnelTierKey | "all">("all");
  const [sort, setSort] = useState<SortKey>("priority");
  const [dir, setDir] = useState<"desc" | "asc">("desc");
  const market = marketFromHost("shopee.co.id");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (tier !== "all" && row.tier !== tier) return false;
      if (!needle) return true;
      return row.name.toLowerCase().includes(needle) || (row.id ?? "").toLowerCase().includes(needle);
    });
    const value = (row: ClassifiedProduct) => {
      if (sort === "priority") return tierRank(row.tier);
      if (sort === "omzet") return row.omzet ?? -1;
      if (sort === "impressions") return row.impressions ?? -1;
      if (sort === "uv") return row.visitors ?? -1;
      if (sort === "ctr") return row.ctrPct ?? -1;
      if (sort === "addToCart") return row.addToCartPct ?? -1;
      return row.convPct ?? -1;
    };
    const sign = dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => sign * (value(a) - value(b)) || a.name.localeCompare(b.name, "id"));
  }, [rows, query, tier, sort, dir]);

  return (
    <div className="ea-analisa ea-funnel">
      <style>{elevateCss}</style>
      <div className="ea-funnel-head">
        <strong>Analisa Detail</strong>
        <span>
          {visible.length} dari {rows.length} produk
        </span>
      </div>
      {note && <p className="ea-note">{note}</p>}
      <div className="ea-funnel-tools">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama/ID produk…" aria-label="Cari produk performa" />
        <select value={tier} aria-label="Filter kelas" onChange={(event) => setTier(event.target.value as FunnelTierKey | "all")}>
          <option value="all">Semua Tier</option>
          <option value="star">⭐ Star</option>
          <option value="cashcow">🪙 Cashcow</option>
          <option value="question">❓ Question Mark</option>
          <option value="dog">🐕 Dog</option>
        </select>
        <select value={sort} aria-label="Urutkan performa" onChange={(event) => setSort(event.target.value as SortKey)}>
          <option value="priority">Urut: Prioritas Tier</option>
          <option value="omzet">Urut: Omzet</option>
          <option value="impressions">Urut: Impresi</option>
          <option value="uv">Urut: Pengunjung (UV)</option>
          <option value="ctr">Urut: CTR</option>
          <option value="addToCart">Urut: Add to Cart Rate</option>
          <option value="conv">Urut: Tingkat Konversi</option>
        </select>
        <button className="ea-btn" type="button" onClick={() => setDir((value) => (value === "desc" ? "asc" : "desc"))}>
          {dir === "desc" ? "↓ Turun" : "↑ Naik"}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="ea-empty">
          <strong>Belum ada data performa.</strong>
          Klik Analisa Funnel Produk untuk memuat 30 hari terakhir.
        </div>
      ) : visible.length === 0 ? (
        <div className="ea-empty">
          <strong>Tidak ada produk di filter ini.</strong>
          Ubah pencarian atau kelasnya.
        </div>
      ) : (
        <div className="ea-funnel-grid">
          {visible.map((row) => {
            const image = thumb(row.image);
            const tone = TIER_META[row.tier];
            return (
              <article key={row.id || row.name} className="ea-funnel-card">
                <div className="ea-funnel-card-head">
                  <div className="ea-funnel-thumb">{image ? <img src={image} alt="" /> : <span>Gambar</span>}</div>
                  <div>
                    <b title={row.name}>{row.name}</b>
                    <span>{row.id ? `ID ${row.id}` : "Tanpa ID"}</span>
                  </div>
                </div>
                <div className="ea-funnel-badges">
                  <em style={{ color: tone.color, background: `${tone.color}22` }}>{tone.label}</em>
                  <span title={DIAGNOSIS_META[row.diagnosis].desc}>{DIAGNOSIS_META[row.diagnosis].label}</span>
                </div>
                <dl>
                  <div>
                    <dt>Impresi</dt>
                    <dd>{blank(row.impressions)}</dd>
                  </div>
                  <div>
                    <dt>Pengunjung (UV)</dt>
                    <dd>{blank(row.visitors)}</dd>
                  </div>
                  <div>
                    <dt>CTR</dt>
                    <dd>{blank(row.ctrPct, 1)}</dd>
                  </div>
                  <div>
                    <dt>Add to Cart Rate</dt>
                    <dd>{blank(row.addToCartPct, 1)}</dd>
                  </div>
                  <div>
                    <dt>Tingkat Konversi</dt>
                    <dd>{blank(row.convPct, 1)}</dd>
                  </div>
                </dl>
                <div className="ea-funnel-omzet">
                  <strong>{row.omzet == null ? "—" : formatMoney(row.omzet, market)}</strong>
                  <span>
                    {blank(row.orders)} order · rata² {row.salesPerOrder == null ? "—" : formatMoney(row.salesPerOrder, market)}/order
                  </span>
                </div>
                {row.repeatPct != null && row.repeatPct > 0 && <p className="ea-funnel-repeat">Repeat order: {blank(row.repeatPct, 1)}</p>}
              </article>
            );
          })}
        </div>
      )}
      <div className="ea-actions">
        <button
          className="ea-btn"
          type="button"
          onClick={() => {
            const day = new Date().toISOString().slice(0, 10);
            downloadText(`performa-produk-${day}.csv`, funnelCsv(rows));
          }}
        >
          CSV funnel
        </button>
      </div>
    </div>
  );
}
