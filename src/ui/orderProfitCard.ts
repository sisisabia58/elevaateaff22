import { formatMoney } from "../shared/money";
import type { Market } from "../shared/types";
import { FEE_BADGE_LABELS, formatOrderPct, type OrderProfitState } from "../shared/order-profit";

export const ORDER_CARD_ID = "ea-order-profit-card";
export const FEE_BADGE_CLASS = "ea-fee-pct-badge";

let badgeTimer = 0;

function findTextLeaf(text: string): HTMLElement | null {
  const candidates = document.querySelectorAll("div, span, p, h1, h2, h3");
  for (const el of candidates) {
    if (el.children.length === 0 && (el.textContent || "").trim() === text) return el as HTMLElement;
  }
  return null;
}

function findAnchorCard(): HTMLElement | null {
  const label = findTextLeaf("Penghasilan Akhir");
  if (!label) return null;
  let node: HTMLElement = label;
  for (let i = 0; i < 12 && node.parentElement; i += 1) {
    node = node.parentElement;
    const parent = node.parentElement;
    if (!parent) continue;
    const hit = [...parent.children].some((sib) => sib !== node && sib.textContent?.includes("Pembayaran Pembeli"));
    if (hit) return node;
  }
  return null;
}

function directTextOf(el: HTMLElement): string {
  let text = "";
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) text += child.textContent || "";
  });
  return text.trim();
}

function findLabelNode(text: string): HTMLElement | null {
  const candidates = document.querySelectorAll("div, span, p, h1, h2, h3");
  for (const el of candidates) {
    if (directTextOf(el as HTMLElement) === text) return el as HTMLElement;
  }
  return null;
}

function injectFeeBadges(state: OrderProfitState): boolean {
  const fees = state.fees;
  if (!fees) return false;
  let allFound = true;
  for (const [label, key] of Object.entries(FEE_BADGE_LABELS)) {
    const pctValue = fees[key];
    if (typeof pctValue !== "number" || !(pctValue >= 0)) continue;
    const node = findLabelNode(label);
    if (!node) {
      allFound = false;
      continue;
    }
    let badge = node.querySelector(`:scope > .${FEE_BADGE_CLASS}`) as HTMLElement | null;
    if (!badge) {
      badge = document.createElement("span");
      badge.className = FEE_BADGE_CLASS;
      badge.style.cssText = "display:inline-block;margin-left:6px;font-size:10px;font-weight:600;color:#7c3aed;background:#ede9fe;padding:1px 7px;border-radius:10px;vertical-align:middle;white-space:nowrap";
      node.appendChild(badge);
    }
    badge.textContent = formatOrderPct(pctValue);
  }
  return allFound;
}

function scheduleBadges(state: OrderProfitState, attemptsLeft = 12) {
  window.clearTimeout(badgeTimer);
  if (injectFeeBadges(state) || attemptsLeft <= 0) return;
  badgeTimer = window.setTimeout(() => scheduleBadges(state, attemptsLeft - 1), 400);
}

export function clearOrderProfit() {
  window.clearTimeout(badgeTimer);
  document.getElementById(ORDER_CARD_ID)?.remove();
  document.querySelectorAll(`.${FEE_BADGE_CLASS}`).forEach((el) => el.remove());
}

function cardHtml(state: OrderProfitState, market: Market): string {
  const color = state.profit >= 0 ? "#16a34a" : "#dc2626";
  const note = state.note
    ? `<div style="font-size:${state.note.tone === "info" ? 11 : 12}px;color:${state.note.tone === "info" ? "#6b7280" : "#92400e"};margin-top:6px">${state.note.text}</div>`
    : "";
  const fees = state.fees
    ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid #f3f4f6"><div style="font-size:11px;color:#6b7280">Total potongan biaya Shopee</div><div style="font-size:11px;color:#6b7280">-${formatMoney(state.fees.totalFees, market)} (${formatOrderPct(state.fees.totalPct)})</div></div>`
    : "";
  const pct = state.profitPct === null ? "" : `<div style="font-size:12px;font-weight:700;color:${color}">${formatOrderPct(state.profitPct)}</div>`;
  return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><div style="font-size:13px;font-weight:700;color:#374151;display:flex;align-items:center;gap:6px">Real Profit <span style="font-size:10px;font-weight:600;color:#0f6e56;background:#e7f6f0;padding:2px 8px;border-radius:10px">Elevate</span></div><div style="font-size:11px;color:#6b7280;margin-top:2px">Total Penghasilan (${formatMoney(state.netIncome, market)}) − HPP (${formatMoney(state.totalHpp, market)}), HPP dari Dashboard Profit (per-SKU) / preset ROAS Calculator</div></div><div style="text-align:right"><div style="font-size:22px;font-weight:800;color:${color}">${formatMoney(state.profit, market)}</div>${pct}</div></div>${note}${fees}`;
}

/** Signed-out teammates still get this card from local HPP. SENA hides it behind a subscription. */
export function mountOrderProfit(state: OrderProfitState, market: Market) {
  let el = document.getElementById(ORDER_CARD_ID);
  const anchor = findAnchorCard();
  if (!el) {
    el = document.createElement("div");
    el.id = ORDER_CARD_ID;
  }
  el.setAttribute("data-profit", String(state.profit));
  el.setAttribute("data-hpp", String(state.totalHpp));
  el.style.cssText = "background:#fff;border:1px solid #ddd6fe;border-radius:8px;padding:16px 20px;margin:12px 0;box-shadow:0 1px 2px rgba(0,0,0,.04);font-family:Segoe UI,sans-serif";
  el.innerHTML = cardHtml(state, market);
  if (anchor?.parentElement) {
    if (anchor.nextSibling !== el) anchor.parentElement.insertBefore(el, anchor.nextSibling);
  } else if (!document.body.contains(el)) {
    el.style.cssText += ";position:fixed;bottom:20px;right:20px;z-index:9998;width:340px";
    document.body.appendChild(el);
  }
  scheduleBadges(state);
}
