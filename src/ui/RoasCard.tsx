import { useRef, useState } from "react";
import { downloadText } from "../shared/csv";
import { formatMoney, marketFromHost } from "../shared/money";
import { importConfirmMessage, mergePresets, parsePresetBackup, presetBackup, presetBackupFilename, type RoasPreset } from "../shared/presets";
import { hitungMultiTierROAS, hitungTargetROAS, realProfit, zoneFor, type RoasInput } from "../shared/roas";
import { elevateCss } from "./css";

const market = marketFromHost("shopee.co.id");

export function RoasCard({
  value,
  onChange,
  spend = "",
  onSpend,
  tableNote,
  presets = {},
  onSavePreset,
  onDeletePreset,
  onReplacePresets,
}: {
  value: RoasInput;
  onChange: (next: RoasInput) => void;
  spend?: string;
  onSpend?: (value: string) => void;
  tableNote?: string | null;
  presets?: Record<string, RoasPreset>;
  onSavePreset?: (name: string, preset: RoasPreset) => void;
  onDeletePreset?: (name: string) => void;
  onReplacePresets?: (presets: Record<string, RoasPreset>) => void;
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
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [query, setQuery] = useState("");
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const visiblePresets = Object.entries(presets).filter(([key]) => key.toLowerCase().includes(query.trim().toLowerCase()));

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
        {onSavePreset && (
          <>
            <div className="ea-field">
              <label htmlFor="ea-preset-name">Nama preset</label>
              <input id="ea-preset-name" type="text" value={name} placeholder="Potongan judul produk" onChange={(event) => setName(event.target.value)} />
              <p>Minimal 5 huruf. Baris iklan yang judulnya memuat nama ini memakai HPP preset.</p>
            </div>
            <div className="ea-field">
              <label htmlFor="ea-preset-id">ID produk</label>
              <input id="ea-preset-id" type="text" value={productId} onChange={(event) => setProductId(event.target.value)} />
            </div>
            <button
              className="ea-btn primary"
              type="button"
              onClick={() => {
                const trimmed = name.trim();
                if (trimmed.length < 5) {
                  setPresetNote("Nama preset minimal 5 huruf.");
                  return;
                }
                onSavePreset(trimmed, { ...value, productId: productId.trim() || undefined });
                setPresetNote(`Preset ${trimmed} tersimpan.`);
              }}
            >
              Simpan preset
            </button>
            <div className="ea-actions">
              <button
                className="ea-btn"
                type="button"
                onClick={() => {
                  if (!Object.keys(presets).length) {
                    setPresetNote("Belum ada preset buat di-export.");
                    return;
                  }
                  downloadText(presetBackupFilename(), JSON.stringify(presetBackup(presets), null, 2), "application/json");
                  setPresetNote(`File ${presetBackupFilename()} diunduh.`);
                }}
              >
                Export preset
              </button>
              {onReplacePresets && (
                <button className="ea-btn" type="button" onClick={() => fileRef.current?.click()}>
                  Import preset
                </button>
              )}
            </div>
            {onReplacePresets && (
              <input
                ref={fileRef}
                aria-label="Impor preset"
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void file.text().then((text) => {
                    const parsed = parsePresetBackup(text);
                    if (!parsed.ok) {
                      setPresetNote(parsed.error);
                      return;
                    }
                    const { merged, collisions } = mergePresets(presets, parsed.presets);
                    const total = Object.keys(parsed.presets).length;
                    if (!window.confirm(importConfirmMessage(total, collisions))) return;
                    onReplacePresets(merged);
                    setPresetNote(`${total} preset diimpor.${collisions.length ? ` ${collisions.length} nama ditimpa.` : ""}`);
                  });
                }}
              />
            )}
            {presetNote && <p className="ea-note">{presetNote}</p>}
            {Object.keys(presets).length > 0 && (
              <div className="ea-preset-list">
                <div className="ea-field">
                  <label htmlFor="ea-preset-search">Cari nama produk</label>
                  <input id="ea-preset-search" type="text" value={query} placeholder="Cari nama produk..." onChange={(event) => setQuery(event.target.value)} />
                </div>
                {visiblePresets.length === 0 && <p className="ea-note">Gak ada preset yang cocok.</p>}
                {visiblePresets.map(([key, preset]) => {
                  const gross = hitungTargetROAS(preset);
                  const presetTiers = hitungMultiTierROAS(preset);
                  return (
                  <div key={key} className="ea-item">
                    <button
                      type="button"
                      onClick={() => {
                        setName(key);
                        setProductId(preset.productId || "");
                        onChange({ ...value, ...preset });
                      }}
                    >
                      <b>{key}</b>
                      <span>
                        Harga {formatMoney(preset.hargaJual, market)} · HPP {formatMoney(preset.hpp, market)}
                        {preset.productId ? ` · ID ${preset.productId}` : ""}
                      </span>
                      <span>
                        Profit kotor {gross.valid ? formatMoney(gross.marginKontribusi, market) : "—"}
                        {presetTiers.map((tier) => ` · ${tier.label} ${tier.targetROAS ? `${tier.targetROAS.toFixed(2)}x` : "—"}`).join("")}
                      </span>
                    </button>
                    {onDeletePreset && (
                      <button type="button" onClick={() => onDeletePreset(key)}>
                        Hapus
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
