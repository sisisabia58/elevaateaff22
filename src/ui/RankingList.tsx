export function RankingList({ data }: { data: unknown }) {
  const record = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const period = (record?.all ?? record?.d30 ?? record) as Record<string, unknown> | null;
  const sorted = period && Array.isArray(period.sorted) ? (period.sorted as Array<{ name?: string; count?: number }>) : null;
  if (!sorted?.length) {
    return <pre className="ea-panel-text">{JSON.stringify(data, null, 2).slice(0, 1200)}</pre>;
  }
  const max = Math.max(1, ...sorted.map((row) => row.count || 0));
  return (
    <div>
      {sorted.slice(0, 8).map((row) => (
        <div key={row.name || String(row.count)} className="ea-rank">
          <span>{row.name || "Varian"}</span>
          <b>{row.count ?? 0}</b>
          <i style={{ width: `${((row.count || 0) / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}
