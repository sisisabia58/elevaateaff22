# Elevate Affiliate

Chrome extension for Shopee affiliates in Indonesia and Malaysia. On a product page it shows commission and copies an affiliate link plus a caption. On search and shop pages it lists the products Shopee already loaded, sorted by estimated commission.

Live rates and offer links are read from the signed-in `affiliate.shopee.co.id` (or `.com.my`) session. Until that session is available, commission uses the default rate in settings.

## Preview

```bash
npm install
npm run dev
```

Open http://127.0.0.1:47331 . The studio shows the search scout, product card, popup, and settings with sample products.

## Load the extension

```bash
npm test
npm run build
```

In Chrome, open `chrome://extensions`, turn on Developer mode, choose **Load unpacked**, and select the `dist` folder.

Then open a Shopee product, search, or shop page while logged in. For a real commission rate and affiliate short link, also be logged in at [affiliate.shopee.co.id](https://affiliate.shopee.co.id).

## What it does not include

Seller tools from the older SENA extension — ROAS, profit dashboard, HPP, and affiliate phone/email unlock — are out of this extension.
