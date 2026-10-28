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
.ea-scout.market {
  background: #fff;
  border: 1px solid #f0f1f3;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.ea-scout.market.dock { max-height: none; box-shadow: none; }
.ea-scout.market.collapsed { overflow: hidden; }
.ea-mkt-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 14px 18px;
  border: 0;
  border-bottom: 1px solid #f0f1f3;
  background: #fff;
  text-align: left;
  cursor: pointer;
}
.ea-scout.collapsed .ea-mkt-head { border-bottom: 0; }
.ea-mkt-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.ea-mkt-title { font-size: 15px; font-weight: 700; }
.ea-mkt-badge {
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 10.5px;
  font-weight: 650;
  padding: 2px 8px;
  border-radius: 999px;
}
.ea-mkt-collapse {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}
.ea-mkt-sub { margin: 0; padding: 12px 18px 0; font-size: 12px; color: #6b7280; }
.ea-market-pill {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483646;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  background: #ee4d2d;
  color: #fff;
  font-weight: 650;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}
.ea-market-pill span { font-weight: 450; opacity: 0.85; }
.ea-mkt-subrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-right: 14px; }
.ea-mkt-subrow .ea-mkt-sub { flex: 1; }
.ea-ai-btn { border: 0; border-radius: 999px; background: #1d4ed8; color: #fff; padding: 6px 10px; font-size: 12px; font-weight: 700; }
.ea-ai-modal {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 16px;
}
.ea-ai-card {
  width: min(560px, 92vw);
  max-height: 82vh;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 14px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ea-ai-card header { display: flex; align-items: flex-start; gap: 8px; padding: 16px 16px 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.25); }
.ea-ai-card h2 { margin: 0; font-size: 16px; }
.ea-ai-card header p { margin: 2px 0 0; color: #94a3b8; font-size: 12px; }
.ea-ai-card header > div { flex: 1; }
.ea-ai-card header button { border: 0; border-radius: 8px; background: #1e293b; color: #e2e8f0; padding: 6px 8px; }
.ea-ai-body { overflow: auto; padding: 16px; line-height: 1.55; }
.ea-ai-body p { margin: 0 0 8px; }
.ea-ai-body ul, .ea-ai-body ol { margin: 0 0 8px; padding-left: 18px; }
.ea-ai-state { text-align: center; padding: 28px 8px; }
.ea-ai-state button { margin-top: 12px; border: 0; border-radius: 10px; background: #6366f1; color: #fff; padding: 8px 12px; font-weight: 700; }
.ea-ai-card footer { padding: 10px 16px 14px; color: #94a3b8; font-size: 11px; border-top: 1px solid rgba(148, 163, 184, 0.2); }
.ea-bars { display: flex; align-items: flex-end; gap: 6px; height: 72px; margin: 8px 0 4px; }
.ea-chart-plot { position: relative; height: 180px; margin: 8px 0 0 48px; }
.ea-gridlines { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.ea-gridline { border-top: 1px solid #f0f1f3; position: relative; height: 0; }
.ea-gridline span { position: absolute; left: -6px; top: -7px; transform: translateX(-100%); font-size: 10px; color: #9ca3af; white-space: nowrap; }
.ea-chart-plot .ea-bars { position: relative; height: 100%; margin: 0; gap: 10px; }
.ea-bar { flex: 1; background: transparent; border: 0; padding: 0; min-height: 8px; display: flex; align-items: flex-end; }
.ea-chart-plot .ea-bar { height: 100%; min-height: 0; cursor: pointer; }
.ea-bar span { display: block; background: #0f6e56; width: 100%; border-radius: 6px 6px 0 0; min-height: 4px; }
.ea-chart-plot .ea-bar span { min-height: 0; border-radius: 4px 4px 0 0; }
.ea-bar[aria-pressed="true"] span { background: #1c1915; }
.ea-bar-labels { display: flex; gap: 10px; margin: 6px 0 4px 48px; }
.ea-bar-labels span { flex: 1; font-size: 10px; line-height: 1.25; color: #9ca3af; text-align: center; word-break: break-word; }
.ea-scout.analisa { max-height: min(78vh, 860px); }
.ea-analisa-scroll { overflow: auto; max-height: 360px; padding: 0 8px 10px; }
.ea-analisa table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 12px; }
.ea-mini-tools { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 14px 8px; }
.ea-mini-tools p { margin: 0; color: #6d655b; font-size: 12px; }
.ea-mini-tools b { color: #1c1915; }
.ea-mini-reset { border: 0; background: transparent; color: #0f6e56; font-weight: 700; padding: 0 4px; }
.ea-mini-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 8px; padding: 0 14px 12px; }
.ea-mini-card { display: flex; flex-direction: column; gap: 3px; border: 1px solid #eee6da; border-radius: 10px; background: #fff; padding: 8px; color: inherit; text-decoration: none; min-width: 0; }
.ea-mini-thumb { aspect-ratio: 1; border-radius: 8px; background: #f3efe7; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #a39b90; font-size: 12px; }
.ea-mini-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ea-mini-name { font-size: 12px; font-weight: 700; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ea-mini-shop { color: #6d655b; font-size: 11px; }
.ea-mini-hi { color: #0f6e56; font-size: 11px; font-weight: 700; }
.ea-mini-price { font-size: 12px; }
.ea-mini-deep { color: #0f6e56; font-size: 10px; font-weight: 700; }
.ea-detail-modal { position: fixed; inset: 0; z-index: 2147483646; pointer-events: auto; display: flex; align-items: center; justify-content: center; background: rgba(15, 23, 42, 0.55); padding: 16px; }
.ea-detail-card { width: min(880px, 96vw); max-height: 86vh; background: #f7f3ec; color: #1c1915; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.ea-detail-card header { display: flex; align-items: center; gap: 8px; padding: 14px 16px; background: #fff; border-bottom: 1px solid #eee6da; }
.ea-detail-card h2 { margin: 0; font-size: 16px; }
.ea-detail-card header p { margin: 0; color: #6d655b; font-size: 12px; }
.ea-detail-card header button { margin-left: auto; border: 0; background: transparent; font-size: 18px; }
.ea-detail-body { overflow: auto; padding: 12px; }
.ea-market-list { display: grid; gap: 8px; padding: 0 8px 12px; }
.ea-market-card { border: 1px solid #eee6da; border-radius: 12px; padding: 10px; background: #fff; }
.ea-market-head { display: flex; gap: 8px; color: inherit; text-decoration: none; }
.ea-market-thumb { width: 44px; height: 44px; border-radius: 8px; background: #f3efe7; overflow: hidden; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #a39b90; font-size: 9px; }
.ea-market-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ea-market-card b { display: block; font-size: 13px; line-height: 1.3; }
.ea-market-card .meta { display: block; color: #6d655b; font-size: 11px; }
.ea-market-row { display: flex; justify-content: space-between; gap: 8px; margin: 8px 0; font-size: 12px; }
.ea-market-section { font-size: 11px; font-weight: 700; letter-spacing: 0.02em; color: #6d655b; margin: 8px 0 2px; }
.ea-analisa .ea-market-card table { width: 100%; min-width: 0; }
.ea-market-card td.on { color: #0f6e56; font-weight: 700; }
.ea-pill { display: inline-block; margin: 0 4px 2px 0; border-radius: 999px; padding: 1px 6px; font-style: normal; font-size: 10px; font-weight: 700; }
.ea-pill.habis { background: #fde8ee; color: #9f1239; }
.ea-pill.aktif { background: #e5f4ee; color: #0f6e56; }
.ea-pill.iklan { background: #f8efd8; color: #8a5a12; }
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
.ea-mkt-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 12px 14px 4px; }
.ea-mkt-stats div { background: #f7f3ec; border-radius: 10px; padding: 8px 10px; }
.ea-mkt-stats span { display: block; font-size: 10.5px; color: #6b7280; margin-bottom: 3px; }
.ea-mkt-stats strong { display: block; font-size: 14px; line-height: 1.3; }
.ea-mkt-stats em { font-style: normal; font-size: 11px; margin-left: 4px; }
.ea-mkt-stats em.up { color: #0f6e56; }
.ea-mkt-stats em.down { color: #9f1239; }
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
.ea-ai-panel .ea-chip { display: inline-flex; margin-top: 8px; }
.ea-part { margin-top: 8px; background: #fff; border: 1px solid #eee6da; border-radius: 12px; padding: 10px; }
.ea-part-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; }
.ea-part p { margin: 8px 0 0; font-size: 13px; white-space: pre-wrap; }
.ea-histori { margin-top: 14px; }
.ea-histori-card { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; padding: 10px; border: 1px solid #eee6da; border-radius: 12px; background: #fff; font-size: 12px; }
.ea-histori-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ea-histori-note { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px; }
.ea-histori-note .empty { color: #9aa1ac; }
.ea-histori-note .ea-btn { padding: 4px 8px; font-size: 11px; }
.ea-histori-card .up { color: #0f6e56; }
.ea-histori-card .down { color: #9f1239; }
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
.ea-preset-list { margin-top: 8px; }
.ea-preset-list .ea-item { display: flex; align-items: center; gap: 8px; }
.ea-preset-list .ea-item > button:first-child { flex: 1; text-align: left; border: 0; background: transparent; padding: 0; }
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
.ea-sheet td:nth-child(2) { text-align: right; font-variant-numeric: tabular-nums; }
.ea-sheet td.down { color: #9f1239; }
.ea-sheet tr.ea-flow-head td { border-top: 0; padding-top: 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; color: #6d655b; }
.ea-profit-metrics { grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); }
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
.ea-charts { display: grid; gap: 12px; margin: 12px 0 16px; }
.ea-chart { background: #fffdf9; border: 1px solid #e6dfd2; border-radius: 16px; padding: 14px; min-width: 0; }
.ea-chart h2 { margin: 0; font-size: 14px; }
.ea-chart .sub { margin: 2px 0 10px; color: #6d655b; font-size: 11px; }
.ea-split { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ea-vbars { display: flex; align-items: flex-end; gap: 6px; height: 120px; }
.ea-vbar { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; }
.ea-vbar i { display: block; width: 100%; background: #dbeafe; border: 1.5px solid #2563eb; border-radius: 4px 4px 0 0; }
.ea-vbar b, .ea-vbar span { font-size: 10px; font-weight: 600; color: #6d655b; }
.ea-hbar { display: grid; grid-template-columns: minmax(88px, 34%) 1fr auto; gap: 8px; align-items: center; margin-top: 6px; font-size: 12px; }
.ea-hbar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ea-hbar i { display: block; height: 8px; background: #2563eb; border-radius: 99px; }
.ea-hbar b { font-size: 12px; font-variant-numeric: tabular-nums; }
@media (max-width: 720px) { .ea-split { grid-template-columns: 1fr; } }
.ea-stores { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 12px; color: #6d655b; }
.ea-stores > span { font-weight: 700; }
.ea-stores label { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e4ddd2; background: #fff; border-radius: 999px; padding: 4px 8px; }
.ea-stores label.on { background: #1c1915; color: #fff; border-color: #1c1915; }
.ea-stores button { border: 0; background: transparent; color: #0f6e56; font-weight: 700; padding: 4px; }
.ea-basis { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #6d655b; }
.ea-basis select { border: 1px solid #e4ddd2; border-radius: 8px; padding: 6px 8px; background: #fff; font: inherit; font-weight: 600; color: #1c1915; max-width: 100%; }
.ea-warn { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 10px; }
.ea-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.ea-chips button { border: 1px solid #e4ddd2; background: #fff; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
.ea-chips button[aria-pressed="true"] { background: #1c1915; color: #fff; border-color: #1c1915; }
.ea-range { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 12px; }
.ea-range label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6d655b; }
.ea-range input { border: 1px solid #e4ddd2; border-radius: 8px; padding: 6px 8px; background: #fff; }
.ea-sheet input[type="number"] { width: 110px; border: 1px solid #e4ddd2; border-radius: 8px; padding: 6px 8px; }
.ea-iklan { margin-top: 16px; }
.ea-iklan-period { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: #92400e; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px 14px; }
.ea-iklan-gap { margin: 0 0 12px; font-size: 12px; line-height: 1.45; color: #991b1b; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 10px 14px; }
.ea-iklan-scroll { overflow-x: auto; margin: 12px 0; }
.ea-iklan table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 760px; }
.ea-iklan th { text-align: left; font-size: 10px; letter-spacing: 0.04em; color: #6d655b; padding: 6px 8px; border-bottom: 1px solid #eee6da; }
.ea-iklan td { padding: 8px; border-top: 1px solid #eee6da; vertical-align: top; text-align: left; }
.ea-iklan.ea-sheet td:nth-child(2) { text-align: left; font-variant-numeric: normal; }
.ea-iklan td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ea-iklan-name { font-weight: 600; }
.ea-iklan-mode { font-size: 10px; color: #6d655b; }
.ea-signal { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; color: #fff; }
.ea-signal.untung { background: #16a34a; }
.ea-signal.waspada { background: #d97706; }
.ea-signal.rugi { background: #dc2626; }
.ea-status { font-size: 11px; font-weight: 700; }
.ea-status.berjalan { color: #15803d; }
.ea-status.lain { color: #c2410c; }
.ea-roas.good { color: #15803d; }
.ea-roas.bad { color: #dc2626; }
.ea-roas-track { height: 4px; width: 72px; background: #f3f4f6; border-radius: 99px; margin-top: 4px; }
.ea-roas-track i { display: block; height: 100%; border-radius: 99px; }
.ea-ad-legend { display: flex; gap: 12px; font-size: 11px; color: #6d655b; }
.ea-ad-legend i, .ea-mini i.spend { background: #dc2626; }
.ea-ad-legend i.gmv, .ea-mini i.gmv { background: #16a34a; }
.ea-ad-legend i.roas, .ea-mini i.roas { background: #7c3aed; }
.ea-ad-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }
.ea-ad-row { margin-top: 10px; }
.ea-ad-row .name { font-size: 12px; font-weight: 700; }
.ea-mini { display: grid; grid-template-columns: 72px minmax(0, 1fr) auto; gap: 8px; align-items: center; font-size: 11px; margin-top: 3px; }
.ea-mini i { display: block; height: 8px; border-radius: 4px; min-width: 2px; }
.ea-mini b { font-variant-numeric: tabular-nums; }
.ea-history-bar { display: flex; gap: 8px; margin: 0 0 10px; }
.ea-history-bar button, #history-panel button { border: 1px solid #e4ddd2; background: #fff; color: #1c1915; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
#history-panel { margin: 0 0 12px; padding: 12px; border: 1px solid #e4ddd2; border-radius: 12px; background: #fff; }
.ea-history-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ea-history-head > div { display: flex; gap: 8px; flex-wrap: wrap; }
#history-panel table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 560px; }
#history-panel th { text-align: left; font-size: 10px; letter-spacing: 0.04em; color: #6d655b; padding: 6px 8px; }
#history-panel td { padding: 6px 8px; border-top: 1px solid #eee6da; font-size: 11px; }
#history-panel td.num { text-align: right; white-space: nowrap; }
.ea-hpp-summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin: 0 0 12px; padding: 10px 12px; border-radius: 12px; background: #fff; border: 1px solid #e4ddd2; }
.ea-hpp-summary.warn { color: #c2410c; border-color: #fdba74; background: #fff7ed; }
.ea-hpp-summary.ok { color: #166534; border-color: #86efac; background: #f0fdf4; }
.ea-hpp-summary.empty { color: #6d655b; }
.ea-hpp-summary button { border: 1px solid #86efac; background: #fff; color: #166534; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
.ea-products table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 640px; }
.ea-products th { text-align: left; font-size: 10px; letter-spacing: 0.04em; color: #6d655b; padding: 6px 8px; border-bottom: 1px solid #eee6da; }
.ea-products td { padding: 8px; border-top: 1px solid #eee6da; vertical-align: middle; text-align: left; }
.ea-products td.num, .ea-products th:nth-child(n+4) { text-align: right; }
.ea-product-name { max-width: 260px; font-size: 11px; color: #6d655b; }
.ea-share { display: inline-flex; align-items: center; gap: 5px; }
.ea-share i { display: block; width: 60px; height: 6px; background: #e7e5e4; border-radius: 99px; overflow: hidden; }
.ea-share i b { display: block; height: 100%; background: #0f6e56; border-radius: 99px; }
.ea-share em { font-size: 10px; color: #6d655b; font-style: normal; font-weight: 600; }
.ea-hpp-import { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.ea-hpp-import .ea-note { flex: 1; min-width: 220px; margin: 0; }
.ea-hpp-import > div { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ea-hpp-import button { border: 1px solid #86efac; background: #fff; color: #166534; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; }
.ea-hpp-import span { font-size: 10px; color: #6d655b; }
#hpp-import-status { white-space: pre-line; }
.ea-hpp-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0 12px; }
.ea-hpp-tools input[type="text"], .ea-hpp-tools input:not([type]) { flex: 1; min-width: 160px; border: 1px solid #86efac; border-radius: 8px; padding: 7px 10px; background: #fff; }
.ea-hpp-tools label { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #6d655b; white-space: nowrap; }
.ea-hpp-tools button { border: 1px solid #86efac; background: #fff; color: #166534; border-radius: 8px; padding: 6px 10px; font-size: 11px; }
.ea-hpp table { min-width: 760px; }
.ea-hpp th, .ea-hpp td { text-align: left; }
.ea-hpp.ea-sheet td:nth-child(2) { text-align: left; font-variant-numeric: normal; }
.ea-hpp td.num, .ea-hpp tfoot td.num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 700; }
.ea-hpp .hpp-group-header { background: #f0fdf4; cursor: pointer; }
.ea-hpp .indent { padding-left: 20px; }
.ea-hpp-sku { display: inline-block; background: #f3f4f6; border-radius: 6px; padding: 2px 6px; font-size: 11px; font-weight: 700; }
.ea-hpp-badge { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; }
.ea-hpp-badge.ok { background: #dcfce7; color: #166534; }
.ea-hpp-badge.miss { background: #fef3c7; color: #92400e; }
.ea-hpp-edit { display: flex; justify-content: flex-end; align-items: center; gap: 4px; }
.ea-hpp-edit input { width: 100px; }
.ea-hpp-edit button { border: 1px solid #86efac; background: #f0fdf4; color: #166534; border-radius: 6px; width: 26px; height: 26px; }
.ea-hpp-all { display: flex; justify-content: flex-end; align-items: center; gap: 4px; margin-top: 4px; font-size: 10px; color: #6d655b; }
.ea-hpp-empty { text-align: center; color: #6d655b; padding: 20px; }
.ea-hpp tfoot td { color: #166534; font-size: 11px; }
button.ea-shortfall { text-align: left; cursor: pointer; border-color: #a5b4fc; background: #f5f3ff; color: inherit; font: inherit; width: 100%; }
button.ea-shortfall strong { color: #6d28d9; }
.ea-modal { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.5); z-index: 40; display: flex; align-items: center; justify-content: center; padding: 20px; }
.ea-modal-card { background: #fffdf9; border-radius: 14px; max-width: 620px; width: 100%; max-height: 85vh; overflow: auto; padding: 20px 22px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25); }
.ea-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.ea-modal-head h2 { margin: 0; font-size: 15px; }
.ea-modal-head button { border: 0; background: transparent; font-size: 20px; color: #6d655b; }
.ea-shortfall-form { background: #ede9fe; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 12px 0; flex-wrap: wrap; color: #6d28d9; font-size: 12px; }
.ea-shortfall-form a { color: #6d28d9; font-weight: 700; white-space: nowrap; }
.ea-shortfall-tools { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.ea-shortfall-tools label { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: #6d655b; }
.ea-shortfall-tools button { font-size: 11px; padding: 6px 10px; border-radius: 6px; border: 1px solid #e4ddd2; background: #fff; }
.ea-modal table { width: 100%; border-collapse: collapse; font-size: 12px; }
.ea-modal th { text-align: left; color: #6d655b; font-size: 11px; padding: 6px 4px; border-bottom: 1px solid #eee6da; }
.ea-modal td { padding: 7px 4px; border-bottom: 1px solid #eee6da; }
.ea-modal td.num { text-align: right; font-weight: 700; color: #dc2626; }
.ea-modal td.mono { font-family: ui-monospace, monospace; }
.ea-modal tr.claimed td { color: #6d655b; text-decoration: line-through; }
.ea-modal tr.claimed td.num { color: #6d655b; }
.ea-shortfall-foot { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; font-size: 11px; color: #6d655b; flex-wrap: wrap; }
.ea-imports { margin: 0 0 14px; }
.ea-tb-files { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.tb-file { display: inline-flex; align-items: center; gap: 5px; background: #f9fafb; border: 1px solid #e6dfd2; border-radius: 20px; padding: 4px 10px; font-size: 11px; }
.tb-file.ok { border-color: #86efac; background: #f0fdf4; color: #166534; }
.tb-file.missing { border-color: #fcd34d; background: #fffbeb; color: #92400e; }
.tb-file.stale { border-color: #fdba74; background: #fff7ed; color: #9a3412; }
.ea-import-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.import-status-chip { background: #fffdf9; border: 1px solid #e6dfd2; border-radius: 10px; padding: 10px 12px; }
.import-status-chip.loaded { border-color: #16a34a; background: #f0fdf4; }
.import-status-chip.stale { border-color: #f59e0b; background: #fffbeb; }
.import-status-chip .dz-label { font-size: 12px; font-weight: 700; }
.dz-status { font-size: 10px; margin-top: 4px; font-weight: 600; color: #6d655b; }
.dz-status.ok { color: #166534; }
.dz-status.stale { color: #b45309; }
.dz-fname { font-size: 10px; color: #6d655b; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
  .ea-metrics, .ea-mkt-stats { grid-template-columns: 1fr 1fr; }
}
`;
