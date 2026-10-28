export const elevateCss = `
.ea-root {
  all: initial;
  color: #1c1915;
  font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  letter-spacing: 0;
}
.ea-root *, .ea-root *::before, .ea-root *::after { box-sizing: border-box; }
.ea-root button, .ea-root input, .ea-root select { font: inherit; color: inherit; }
.ea-root button { cursor: pointer; }
.ea-root button:focus-visible, .ea-root input:focus-visible, .ea-root select:focus-visible {
  outline: 2px solid #0f6e56;
  outline-offset: 2px;
}

.ea-card, .ea-scout, .ea-popup, .ea-options {
  background: #fffdf9;
  color: #1c1915;
}
.ea-card, .ea-scout {
  position: fixed;
  z-index: 2147483646;
  pointer-events: auto;
  border: 1px solid #e6dfd2;
  border-radius: 18px;
  box-shadow: 0 16px 50px rgba(28, 25, 21, 0.16);
}
.ea-page-row { display: inline-flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0 8px; vertical-align: middle; pointer-events: auto; }
.ea-page-btn {
  border: 1px solid #e6dfd2;
  background: #fffdf9;
  color: #1c1915;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
}
.ea-page-btn:hover { border-color: #0f6e56; color: #0f6e56; }
.ea-card { width: 336px; right: 16px; bottom: 16px; max-height: calc(100vh - 32px); overflow: auto; }
.ea-scout { width: 380px; right: 16px; top: 72px; max-height: min(640px, calc(100vh - 96px)); display: flex; flex-direction: column; overflow: auto; }
.ea-card.embedded, .ea-scout.embedded { position: absolute; }
.ea-card.embedded { max-height: calc(100% - 32px); }
.ea-scout.embedded { top: 64px; max-height: calc(100% - 80px); }
.ea-scout.dock {
  position: relative;
  top: auto;
  right: auto;
  width: 100%;
  max-height: 460px;
  margin: 0 0 16px;
  box-shadow: none;
}
.ea-bars { display: flex; align-items: flex-end; gap: 6px; height: 72px; margin: 8px 0 4px; }
.ea-bar { flex: 1; background: transparent; border: 0; padding: 0; min-height: 8px; display: flex; align-items: flex-end; }
.ea-bar span { display: block; background: #0f6e56; width: 100%; border-radius: 6px 6px 0 0; min-height: 4px; }
.ea-bar[aria-pressed="true"] span { background: #1c1915; }
.ea-bar-labels { display: flex; gap: 6px; }
.ea-bar-labels span { flex: 1; font-size: 10px; line-height: 1.25; color: #6d655b; text-align: center; word-break: break-word; }
.ea-scout.analisa { max-height: min(78vh, 860px); }
.ea-analisa-scroll { overflow: auto; max-height: 360px; padding: 0 8px 10px; }
.ea-analisa table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 12px; }
.ea-analisa th, .ea-analisa td { padding: 6px 8px; border-bottom: 1px solid #eee6da; text-align: left; vertical-align: top; }
.ea-analisa th button { border: 0; background: transparent; font-weight: 700; padding: 0; }
.ea-analisa td span, .ea-analisa td b { display: block; }
.ea-analisa td span { color: #6d655b; font-size: 11px; }
.ea-scout-tools input, .ea-scout-tools select {
  border: 1px solid #e6dfd2;
  border-radius: 10px;
  background: #fff;
  padding: 6px 8px;
}
.ea-metrics { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
.ea-metrics div { background: #fff; border-radius: 10px; padding: 7px 8px; min-width: 72px; flex: 1; }
.ea-metrics strong { display: block; font-size: 13px; }
.ea-metrics span { color: #6d655b; font-size: 11px; }
.ea-summary { display: flex; gap: 8px; flex-wrap: wrap; padding: 0 14px 8px; }
.ea-summary div { background: #f7f3ec; border-radius: 10px; padding: 8px 10px; min-width: 90px; }
.ea-summary strong { display: block; font-size: 14px; }
.ea-summary span { color: #6d655b; font-size: 11px; }
.ea-popup { width: 360px; min-height: 280px; background: #f7f3ec; }
.ea-options { max-width: 720px; }

.ea-head, .ea-scout-head, .ea-pop-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  position: sticky;
  top: 0;
  background: #fffdf9;
  z-index: 1;
}
.ea-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #1c1915;
  color: #e7f6f0;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  flex: none;
}
.ea-brand { font-weight: 700; font-size: 13px; letter-spacing: 0.01em; }
.ea-brand small { display: block; font-weight: 500; color: #6d655b; font-size: 11px; }
.ea-spacer { flex: 1; }
.ea-icon-btn {
  border: 0;
  background: transparent;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: #6d655b;
}
.ea-icon-btn:hover { background: #f3eee6; color: #1c1915; }

.ea-body { padding: 0 14px 14px; }
.ea-name { font-size: 15px; font-weight: 650; margin: 0 0 4px; }
.ea-meta { color: #6d655b; font-size: 12px; margin-bottom: 12px; }
.ea-price { font-variant-numeric: tabular-nums; }

.ea-commission {
  background: #f7f3ec;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-end;
}
.ea-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6d655b; }
.ea-amount { font-size: 26px; font-weight: 720; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.ea-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 700;
}
.ea-badge.live { background: #e5f4ee; color: #0f6e56; }
.ea-badge.estimate { background: #f8efd8; color: #8a5a12; }
.ea-note { margin: 8px 0 0; color: #6d655b; font-size: 12px; }
.ea-facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ea-chip { background: #fff; border: 1px solid #e6dfd2; border-radius: 999px; padding: 2px 8px; font-size: 11px; color: #3f3a33; }

.ea-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.ea-panel-text { white-space: pre-wrap; background: #f7f3ec; border-radius: 12px; padding: 10px; max-height: 180px; overflow: auto; font-size: 13px; margin-top: 8px; }
.ea-rank { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; margin-top: 8px; font-size: 13px; }
.ea-rank i { grid-column: 1 / -1; display: block; height: 6px; background: #0f6e56; border-radius: 99px; }
.ea-seller { width: 420px; top: 16px; bottom: auto; }
.ea-funnel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.ea-funnel-head span, .ea-funnel-card-head span, .ea-funnel-omzet span, .ea-funnel-repeat { color: #6d655b; font-size: 11px; }
.ea-funnel-tools { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.ea-funnel-tools input, .ea-funnel-tools select { border: 1px solid #e6dfd2; border-radius: 10px; background: #fff; padding: 6px 8px; min-width: 0; }
.ea-funnel-tools input { flex: 1 1 140px; }
.ea-funnel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.ea-funnel-card { border: 1px solid #eee6da; border-radius: 12px; padding: 10px; background: #fff; }
.ea-funnel-card-head { display: flex; gap: 8px; margin-bottom: 8px; }
.ea-funnel-card-head b { display: block; font-size: 13px; line-height: 1.3; }
.ea-funnel-thumb { width: 40px; height: 40px; border-radius: 8px; background: #f3efe7; overflow: hidden; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #a39b90; font-size: 9px; }
.ea-funnel-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ea-funnel-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.ea-funnel-badges em, .ea-funnel-badges span { font-style: normal; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
.ea-funnel-badges span { background: #f3efe7; color: #3f3a33; font-weight: 650; }
.ea-funnel-card dl { margin: 0; border-top: 1px dashed #eee6da; padding-top: 6px; }
.ea-funnel-card dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; padding: 2px 0; }
.ea-funnel-card dt { color: #6d655b; }
.ea-funnel-card dd { margin: 0; font-weight: 700; }
.ea-funnel-omzet { border-top: 1px dashed #eee6da; margin-top: 6px; padding-top: 6px; }
.ea-funnel-omzet strong { display: block; color: #ee4d2d; font-size: 14px; }
.ea-funnel-repeat { margin: 6px 0 0; }
.ea-zones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.ea-zone { border: 1px solid #e6dfd2; border-radius: 12px; padding: 8px; background: #fff; }
.ea-zone.on { border-color: #0f6e56; background: #e5f4ee; }
.ea-zone b { display: block; font-size: 16px; }
.ea-dash { background: #f7f3ec; min-height: 100%; padding: 28px 16px 48px; }
.ea-dash h1 { font-size: 28px; line-height: 1.15; margin: 8px 0 6px; letter-spacing: -0.03em; }
.ea-dash .lede { color: #6d655b; margin: 0 0 12px; }
.ea-dash-wrap { max-width: 960px; margin: 0 auto; }
.ea-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }
.ea-metric, .ea-drop, .ea-sheet { background: #fffdf9; border: 1px solid #e6dfd2; border-radius: 16px; padding: 14px; }
.ea-metric strong { display: block; font-size: 22px; letter-spacing: -0.03em; margin-top: 4px; }
.ea-drop { border-style: dashed; margin-bottom: 12px; }
.ea-sheet { margin-top: 12px; }
.ea-sheet table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ea-sheet td { padding: 6px 4px; border-top: 1px solid #eee6da; }
.ea-share { width: min(280px, 100%); border-radius: 16px; border: 1px solid #e6dfd2; margin-top: 12px; }
.ea-btn {
  border-radius: 10px;
  border: 1px solid #e6dfd2;
  background: #fff;
  padding: 8px 10px;
  font-weight: 650;
  font-size: 13px;
}
.ea-btn:hover { border-color: #cfc4b2; }
.ea-btn.primary { background: #0f6e56; color: #f4fffb; border-color: #0f6e56; flex: 1; }
.ea-btn.primary:hover { background: #0c5b48; }
.ea-btn:disabled { opacity: 0.55; cursor: default; }
.ea-btn.full { width: 100%; }

.ea-caption {
  margin-top: 12px;
  border-top: 1px solid #eee6da;
  padding-top: 10px;
}
.ea-caption p { margin: 6px 0 8px; font-size: 13px; }
.ea-row { display: flex; gap: 6px; align-items: center; }
.ea-status { min-height: 18px; font-size: 12px; color: #0f6e56; margin-top: 8px; }
.ea-status.warn { color: #8a5a12; }

.ea-empty, .ea-loading {
  padding: 8px 2px 4px;
  color: #3f3a33;
}
.ea-empty strong, .ea-loading strong { display: block; margin-bottom: 4px; }

.ea-scout-tools, .ea-sort {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 0 14px 10px;
  flex-wrap: wrap;
}
.ea-sort select { border: 1px solid #e6dfd2; border-radius: 10px; background: #fff; padding: 6px 8px; }
.ea-sort button, .ea-mini {
  border: 1px solid #e6dfd2;
  background: #fff;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 650;
}
.ea-sort button[aria-pressed="true"] { background: #1c1915; color: #fffdf9; border-color: #1c1915; }
.ea-list { overflow: auto; padding: 0 8px 8px; }
.ea-item {
  width: 100%;
  text-align: left;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 10px;
}
.ea-item:hover { background: #f7f3ec; }
.ea-item b { font-weight: 650; font-size: 13px; }
.ea-item span { color: #6d655b; font-size: 12px; }
.ea-item em { font-style: normal; font-weight: 720; font-variant-numeric: tabular-nums; }
.ea-ad { color: #8a5a12; font-size: 10px; font-weight: 800; letter-spacing: 0.04em; }

.ea-options { background: #f7f3ec; min-height: 100%; padding: 28px 20px 48px; }
.ea-options-card {
  max-width: 640px;
  margin: 0 auto;
  background: #fffdf9;
  border: 1px solid #e6dfd2;
  border-radius: 20px;
  padding: 22px;
}
.ea-options h1 { font-size: 28px; line-height: 1.15; margin: 8px 0 6px; letter-spacing: -0.03em; }
.ea-options .lede { color: #6d655b; margin: 0 0 18px; }
.ea-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.ea-field label { font-weight: 700; font-size: 13px; }
.ea-field p { margin: 0; color: #6d655b; font-size: 12px; }
.ea-field input[type="number"], .ea-field input[type="text"], .ea-field input[type="password"] {
  width: 100%;
  max-width: 420px;
  border: 1px solid #e6dfd2;
  border-radius: 10px;
  padding: 8px 10px;
  background: #fff;
}
.ea-field input[type="number"] { width: 120px; }
.ea-tones { display: flex; gap: 8px; }
.ea-check { display: flex; gap: 8px; align-items: flex-start; }
.ea-preview {
  background: #f7f3ec;
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
}
.ea-saved { color: #0f6e56; font-size: 12px; font-weight: 700; min-height: 18px; }

@media (max-width: 720px) {
  .ea-card, .ea-scout:not(.dock) { left: 12px; right: 12px; width: auto; }
  .ea-scout:not(.dock) { top: 12px; }
  .ea-metrics { grid-template-columns: 1fr 1fr; }
}
`;
