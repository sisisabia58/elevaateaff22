# Elevate Affiliate

Chrome extension for the internal Shopee team. It shows commission on product, search, and shop pages, and adds Seller Center tools plus a profit tab. There is no plan picker and no checkout page.

Live rates and offer links are read from the signed-in `affiliate.shopee.co.id` (or `.com.my`) session. Until that session is available, commission uses the default rate in settings. Gemini, variant ranking, HPP backup, and saved creator contacts use the existing Supabase project after Google sign-in.

## Preview

```bash
npm install
npm run dev
```

Open http://127.0.0.1:47331 . The studio shows the docked scout with a shop summary, the share card, the ROAS card, an empty profit dashboard, the popup, and settings.

## Load the extension

```bash
cp src/shared/supabase-config.example.ts src/shared/supabase-config.ts
npm test
npm run build
```

Fill `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `src/shared/supabase-config.ts`. That file stays out of git.

In Chrome, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select the `dist` folder.

Then open a Shopee product, search, or shop page. For a real commission rate, also be logged in at [affiliate.shopee.co.id](https://affiliate.shopee.co.id). Seller Center pages get the ROAS, funnel, order profit, broadcast, and creator tools. The toolbar popup opens the profit tab.
