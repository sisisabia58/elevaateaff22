import { useState } from "react";
import { rankingForPeriod, type VariantPeriod } from "../shared/analytics";

const PERIODS: Array<{ id: VariantPeriod; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "d30", label: "30 hari" },
  { id: "d90", label: "90 hari" },
];

export function RankingList({ data, reviews }: { data: unknown; reviews?: unknown[] }) {
  const [period, setPeriod] = useState<VariantPeriod>("all");
  const tally = rankingForPeriod(data, reviews, period);
  const max = Math.max(1, ...tally.sorted.map((row) => row.count));
  return (
    <div>
      <div className="ea-sort" role="group" aria-label="Periode varian">
        {PERIODS.map((entry) => (
          <button key={entry.id} type="button" aria-pressed={period === entry.id} onClick={() => setPeriod(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>
      {tally.sorted.length === 0 ? (
        <p className="ea-note">Belum ada varian pada periode ini.</p>
      ) : (
        tally.sorted.slice(0, 8).map((row) => (
          <div key={row.name} className="ea-rank">
            <span>{row.name}</span>
            <b>{row.count}</b>
            <i style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        ))
      )}
      {tally.withoutVariant > 0 && (
        <p className="ea-note">
          {tally.withoutVariant.toLocaleString("id-ID")} ulasan tidak menyebut varian.
        </p>
      )}
    </div>
  );
}
