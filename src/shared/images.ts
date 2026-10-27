import { downloadBlob } from "./csv";

export async function zipImages(urls: string[], filename: string): Promise<number> {
  const unique = [...new Set(urls.filter(Boolean))].slice(0, 24);
  if (!unique.length) throw new Error("Belum ada gambar. Refresh halaman produk.");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let saved = 0;
  for (const url of unique) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      saved += 1;
      zip.file(`gambar-${saved}.jpg`, bytes);
    } catch {
      /* one broken image does not cancel the zip */
    }
  }
  if (!saved) throw new Error("Gambar tidak bisa diunduh. Refresh halaman produk.");
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(filename, blob);
  return saved;
}
