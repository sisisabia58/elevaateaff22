import { build } from "esbuild";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

const manifest = {
  manifest_version: 3,
  name: "Elevate Affiliate",
  version: "0.2.0",
  description:
    "Komisi, Seller Center, dan laba untuk tim internal — tanpa halaman langganan.",
  action: {
    default_title: "Elevate Affiliate",
    default_popup: "popup.html",
    default_icon: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  },
  background: { service_worker: "background.js" },
  options_ui: { page: "options.html", open_in_tab: true },
  permissions: ["storage", "tabs", "identity", "alarms"],
  host_permissions: [
    "https://shopee.co.id/*",
    "https://shopee.com.my/*",
    "https://seller.shopee.co.id/*",
    "https://affiliate.shopee.co.id/*",
    "https://affiliate.shopee.com.my/*",
    "https://*.susercontent.com/*",
    "https://daajjdzuaxlfdasymwpx.supabase.co/*",
  ],
  icons: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  content_scripts: [
    {
      matches: ["https://shopee.co.id/*", "https://shopee.com.my/*"],
      js: ["content.js"],
      run_at: "document_start",
    },
    {
      matches: ["https://affiliate.shopee.co.id/*", "https://affiliate.shopee.com.my/*"],
      js: ["affiliate-bridge.js"],
      run_at: "document_start",
      all_frames: true,
      world: "MAIN",
    },
    {
      matches: ["https://seller.shopee.co.id/*"],
      js: ["seller-inject.js"],
      run_at: "document_start",
      world: "MAIN",
    },
    {
      matches: ["https://seller.shopee.co.id/*"],
      js: ["seller.js"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["inject.js"],
      matches: ["https://shopee.co.id/*", "https://shopee.com.my/*"],
    },
  ],
};

const page = (script) => `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Elevate Affiliate</title>
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <script src="${script}"></script>
  </body>
</html>
`;

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await build({
  absWorkingDir: root,
  entryPoints: {
    content: "src/content/main.tsx",
    inject: "src/content/inject.ts",
    "affiliate-bridge": "src/content/affiliate-bridge.ts",
    background: "src/background.ts",
    popup: "src/popup/main.tsx",
    options: "src/options/main.tsx",
    dashboard: "src/dashboard/main.tsx",
    seller: "src/seller/main.tsx",
    "seller-inject": "src/seller/inject.ts",
  },
  bundle: true,
  format: "iife",
  target: "chrome120",
  jsx: "automatic",
  outdir: dist,
  entryNames: "[name]",
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
});

await writeFile(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(resolve(dist, "popup.html"), page("popup.js"));
await writeFile(resolve(dist, "options.html"), page("options.js"));
await writeFile(resolve(dist, "dashboard.html"), page("dashboard.js"));
await cp(resolve(root, "public/icons"), resolve(dist, "icons"), { recursive: true });
console.log("built", dist);
