export function drawShareCard(input: {
  name: string;
  price: string;
  commission: string;
  rate: string;
  shop: string | null;
}): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f7f3ec";
  ctx.fillRect(0, 0, 800, 1000);
  ctx.fillStyle = "#1c1915";
  ctx.fillRect(0, 0, 800, 128);
  ctx.fillStyle = "#e7f6f0";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("Elevate Affiliate", 48, 76);
  ctx.fillStyle = "#1c1915";
  ctx.font = "700 42px sans-serif";
  const name = wrap(ctx, input.name, 700).slice(0, 4);
  name.forEach((line, index) => ctx.fillText(line, 48, 220 + index * 52));
  ctx.fillStyle = "#6d655b";
  ctx.font = "500 24px sans-serif";
  ctx.fillText(input.shop || "Shopee", 48, 460);
  ctx.fillStyle = "#1c1915";
  ctx.font = "700 64px sans-serif";
  ctx.fillText(input.price, 48, 560);
  ctx.fillStyle = "#0f6e56";
  roundRect(ctx, 48, 620, 704, 220, 28);
  ctx.fill();
  ctx.fillStyle = "#e7f6f0";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("KOMISI", 80, 680);
  ctx.font = "700 64px sans-serif";
  ctx.fillText(input.commission, 80, 760);
  ctx.font = "600 28px sans-serif";
  ctx.fillText(input.rate, 80, 800);
  return canvas.toDataURL("image/png");
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > width && current) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function downloadDataUrl(filename: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
