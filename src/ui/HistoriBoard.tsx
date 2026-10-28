import { useEffect, useState } from "react";
import { downloadText } from "../shared/csv";
import {
  findPeriodLabel,
  formatSavedAt,
  historiCsv,
  historiFilename,
  historiFromLabels,
  loadHistori,
  pushSnapshot,
  readHistoriLabels,
  removeSnapshot,
  roasDeltaPct,
  saveHistori,
  updateSnapshotNote,
  type HistoriSnapshot,
} from "../shared/histori";

function money(value: number | null): string {
  if (value == null) return "—";
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

export function HistoriBoard({ productId, scopeSelector }: { productId: string; scopeSelector?: string }) {
  const [list, setList] = useState<HistoriSnapshot[]>([]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadHistori(productId).then((rows) => {
      if (!cancelled) setList(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function persist(next: HistoriSnapshot[], message: string) {
    setList(next);
    await saveHistori(productId, next);
    setStatus(message);
  }

  async function editNote(row: HistoriSnapshot) {
    const input = window.prompt("Edit catatan snapshot ini (kosongin buat hapus catatan):", row.note || "");
    if (input === null) return;
    const next = updateSnapshotNote(list, row.savedAt, input);
    await persist(next, input.trim() ? "Catatan diperbarui." : "Catatan dihapus.");
  }

  async function save() {
    const scope = scopeSelector ? document.querySelector(scopeSelector) ?? document : document;
    const read = historiFromLabels(readHistoriLabels(scope), findPeriodLabel(scope), note);
    if (!read) {
      setStatus("Angka Penjualan, Biaya Iklan, dan Iklan Dilihat belum kebaca di halaman ini.");
      return;
    }
    setMissing(read.missingConversion);
    const next = pushSnapshot(list, read.snapshot);
    setNote("");
    await persist(next, "Performa tersimpan.");
  }

  const previous = list.length > 1 ? list[list.length - 2] : null;
  const current = list.length ? list[list.length - 1] : null;
  const delta = current && previous ? roasDeltaPct(current.roasAktual, previous.roasAktual) : null;

  return (
    <section className="ea-histori" aria-label="Histori Performa">
      <div className="ea-kicker">Histori Performa</div>
      <p className="ea-note">Simpan angka iklan yang sedang tampil, lalu bandingkan dengan snapshot sebelumnya. Maksimal 30 simpanan per produk.</p>
      <label className="ea-field">
        Catatan evaluasi
        <input type="text" aria-label="Catatan histori" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <div className="ea-actions">
        <button className="ea-btn primary" type="button" onClick={() => void save()}>
          Simpan Performa
        </button>
        <button
          className="ea-btn"
          type="button"
          onClick={() => {
            if (!list.length) {
              setStatus("Belum ada histori performa buat halaman ini. Klik Simpan Performa dulu minimal sekali.");
              return;
            }
            downloadText(historiFilename(productId), historiCsv(list));
            setStatus(`CSV ${historiFilename(productId)} diunduh.`);
          }}
        >
          Export Histori
        </button>
      </div>
      {missing && (
        <p className="ea-note">
          Tingkat Konversi belum kesimpen — centang kriteria Tingkat Konversi di Pilih Kriteria pada tabel Rincian Performa biar histori-nya lebih lengkap.
        </p>
      )}
      {!list.length && <p className="ea-note">Belum ada histori. Klik Simpan Performa saat angka iklan sudah tampil.</p>}
      {[previous, current].filter(Boolean).map((snapshot) => {
        const row = snapshot as HistoriSnapshot;
        const isCurrent = current?.savedAt === row.savedAt;
        return (
          <article key={row.savedAt} className="ea-histori-card">
            <div className="ea-histori-head">
              <b>{isCurrent && previous ? "Sekarang" : previous ? "Sebelumnya" : "Tersimpan"}</b>
              <button className="ea-btn" type="button" onClick={() => void persist(removeSnapshot(list, row.savedAt), "Snapshot dihapus.")}>
                Hapus
              </button>
            </div>
            <span>{row.periodLabel || formatSavedAt(row.savedAt)}</span>
            <span>Disimpan: {formatSavedAt(row.savedAt)}</span>
            <span>Iklan dilihat {row.iklanDilihat.toLocaleString("id-ID")}</span>
            <span>Konversi {row.tingkatKonversi == null ? "—" : `${row.tingkatKonversi.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`}</span>
            <span>Biaya iklan aktual {money(row.biayaIklanAktual)}</span>
            <span>ROAS aktual {row.roasAktual == null ? "—" : row.roasAktual.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <div className="ea-histori-note">
              <span className={row.note ? undefined : "empty"}>{row.note || "Belum ada catatan"}</span>
              <button className="ea-btn" type="button" title="Edit catatan snapshot ini" onClick={() => void editNote(row)}>
                Edit catatan
              </button>
            </div>
            {isCurrent && delta != null && (
              <strong className={delta >= 0 ? "up" : "down"}>
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}% vs sebelumnya
              </strong>
            )}
          </article>
        );
      })}
      {status && <p className="ea-status">{status}</p>}
    </section>
  );
}
