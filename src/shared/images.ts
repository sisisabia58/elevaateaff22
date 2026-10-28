import { downloadBlob } from "./csv";

export type ImageGroup = { name: string; urls: string[] };

export type ImageZipEntry = { path: string; url: string };

function safeFolder(name: string, index: number): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").trim().replace(/\s+/g, "-").slice(0, 48);
  return cleaned || `varian-${index + 1}`;
}

export function imageZipPlan(urls: string[], groups: ImageGroup[] = []): ImageZipEntry[] {
  const gallery = [...new Set(urls.filter(Boolean))].slice(0, 24);
  const used = new Set<string>();
  const folders = groups.flatMap((group, index) => {
    const unique = [...new Set(group.urls.filter(Boolean))].slice(0, 12);
    if (!unique.length) return [];
    let folder = safeFolder(group.name, index);
    let suffix = 2;
    while (used.has(folder)) {
      folder = `${safeFolder(group.name, index)}-${suffix}`;
      suffix += 1;
    }
    used.add(folder);
    return [{ folder, urls: unique }];
  });
  const galleryPrefix = folders.length ? "galeri/" : "";
  const entries: ImageZipEntry[] = gallery.map((url, index) => ({ path: `${galleryPrefix}gambar-${index + 1}.jpg`, url }));
  for (const folder of folders) {
    folder.urls.forEach((url, index) => {
      entries.push({ path: `varian/${folder.folder}/gambar-${index + 1}.jpg`, url });
    });
  }
  return entries;
}

export async function zipImages(urls: string[], filename: string, groups: ImageGroup[] = []): Promise<number> {
  const plan = imageZipPlan(urls, groups);
  if (!plan.length) throw new Error("Belum ada gambar. Refresh halaman produk.");
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  let saved = 0;
  for (const entry of plan) {
    try {
      const response = await fetch(entry.url);
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      saved += 1;
      zip.file(entry.path, bytes);
    } catch {
      /* one broken image does not cancel the zip */
    }
  }
  if (!saved) throw new Error("Gambar tidak bisa diunduh. Refresh halaman produk.");
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(filename, blob);
  return saved;
}
