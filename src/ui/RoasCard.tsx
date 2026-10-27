import { formatMoney, marketFromHost } from "../shared/money";
import { hitungMultiTierROAS, hitungTargetROAS, realProfit, zoneFor, type RoasInput } from "../shared/roas";
import { elevateCss } from "./css";

const market = marketFromHost("shopee.co.id");

export function RoasCard({
  value,
  onChange,
  spend = "",
  onSpend,
  tableNote,
}: {
  value: RoasInput;
  onChange: (next: RoasInput) => void;
  spend?: string;
  onSpend?: (value: string) => void;
  tableNote?: string | null;
}) {
  const hasil = hitungTargetROAS(value);
  const tiers = hitungMultiTierROAS(value);
  const actual = spend.trim() ? Number(spend) : null;
  const actualRoas = actual && actual > 0 ? value.hargaJual / (actual * 1.11) : null;
  const zone = zoneFor(actualRoas, tiers);
  const profit =
    actual !== null
      ? realProfit({
          price: value.hargaJual,
          fees: hasil.totalBiayaPerPesanan,
          hpp: value.hpp + (value.operasional ?? 0),
          ads: actual * 1.11,
        })
      : null;
  const set = (patch: Partial<RoasInput>) => onChange({ ...value, ...patch });

  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <section className="ea-sheet" aria-label="Kalkulator ROAS">
        <div className="ea-kicker">ROAS iklan</div>
        <div className="ea-field">
          <label htmlFor="ea-harga">Harga jual</label>
          <input id="ea-harga" type="number" value={value.hargaJual} onChange={(event) => set({ hargaJual: Number(event.target.value) })} />
        </div>
        <div className="ea-field">
          <label htmlFor="ea-hpp">HPP</label>
          <input id="ea-hpp" type="number" value={value.hpp} onChange={(event) => set({ hpp: Number(event.target.value) })} />
        </div>
        <div className="ea-field">
          <label htmlFor="ea-ops">Operasional</label>
          <input id="ea-ops" type="number" value={value.operasional ?? 0} onChange={(event) => set({ operasional: Number(event.target.value) })} />
        </div>
        <div className="ea-field">
          <label htmlFor="ea-aff">Komisi affiliate (%)</label>
          <input
            id="ea-aff"
            type="number"
            value={value.komisiAffiliatePersen ?? 0}
            onChange={(event) => set({ komisiAffiliatePersen: Number(event.target.value) })}
          />
        </div>
        {onSpend && (
          <div className="ea-field">
            <label htmlFor="ea-spend">Biaya iklan tercatat</label>
            <input id="ea-spend" type="number" value={spend} onChange={(event) => onSpend(event.target.value)} />
            <p>PPN topup 11% ditambahkan ke biaya iklan sebelum zona dihitung.</p>
          </div>
        )}
        <div className="ea-metrics">
          <div className="ea-metric">
            <span className="ea-kicker">Margin</span>
            <strong>{hasil.valid ? formatMoney(hasil.marginKontribusi, market) : "—"}</strong>
          </div>
          <div className="ea-metric">
            <span className="ea-kicker">Target Rugi</span>
            <strong>{hasil.targetROAS ? `${hasil.targetROAS.toFixed(2)}x` : "—"}</strong>
          </div>
          {profit !== null && (
            <div className="ea-metric">
              <span className="ea-kicker">Laba bersih</span>
              <strong>{formatMoney(profit, market)}</strong>
            </div>
          )}
        </div>
        <div className="ea-zones">
          {tiers.map((tier) => (
            <div key={tier.key} className={zone?.key === tier.key ? "ea-zone on" : "ea-zone"}>
              <span className="ea-kicker">{tier.label}</span>
              <b>{tier.targetROAS ? `${tier.targetROAS.toFixed(2)}x` : "—"}</b>
            </div>
          ))}
        </div>
        {zone && <p className="ea-note">Zona saat ini: {zone.label}.</p>}
        {tableNote && <p className="ea-note">{tableNote}</p>}
      </section>
    </div>
  );
}
