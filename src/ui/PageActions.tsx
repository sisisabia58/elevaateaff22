import { elevateCss } from "./css";

export function PageActions({
  onAnalisa,
  onVariant,
  onAi,
  onThread,
  onImages,
}: {
  onAnalisa: () => void;
  onVariant: () => void;
  onAi: () => void;
  onThread: () => void;
  onImages: () => void;
}) {
  const actions = [
    ["Analisa", "Angka 30 hari, omzet, dan trend", onAnalisa],
    ["Analisa Varian", "Peringkat varian dari ulasan", onVariant],
    ["Analisa AI", "Ringkas produk", onAi],
    ["Thread Affiliate", "5 angle untuk promosi", onThread],
    ["Download Gambar", "Simpan galeri produk", onImages],
  ] as const;
  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <div className="ea-page-row" role="group" aria-label="Aksi Elevate di halaman produk">
        {actions.map(([label, title, onClick]) => (
          <button key={label} className="ea-page-btn" type="button" title={title} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
