import { useState, type ReactNode } from "react";
import { localThread, THREAD_ANGLES, type AiPanel, type Caption, type ThreadAngle } from "../shared/captions";
import { formatMoney, formatRate } from "../shared/money";
import type { CommissionView, Market, ScoutItem } from "../shared/types";
import { elevateCss } from "./css";
import { ProductMetrics } from "./ProductMetrics";

export function ProductCard({
  item,
  market,
  commission,
  captions,
  phase,
  detail,
  linkLabel,
  onCopyLink,
  onCopyCaption,
  onClose,
  embedded = false,
  onShare,
  onZip,
  onSummarize,
  onThread,
  onRank,
  panel,
  ranking,
}: {
  item: ScoutItem | null;
  market: Market;
  commission: CommissionView | null;
  captions: Caption[];
  phase: "loading" | "ready" | "error";
  detail?: string;
  linkLabel: string;
  onCopyLink: () => void;
  onCopyCaption: (text: string) => void;
  onClose: () => void;
  embedded?: boolean;
  onShare?: () => void;
  onZip?: () => void;
  onSummarize?: () => void;
  onThread?: (angle: ThreadAngle) => void;
  onRank?: () => void;
  panel?: AiPanel | null;
  ranking?: ReactNode;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [angle, setAngle] = useState<ThreadAngle>("problem_solution");
  const primary = captions[0];

  function flash(message: string) {
    setCopied(message);
    window.setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div className="ea-root">
      <style>{elevateCss}</style>
      <aside className={embedded ? "ea-card embedded" : "ea-card"} aria-label="Elevate Affiliate">
        <div className="ea-head">
          <div className="ea-mark">E</div>
          <div className="ea-brand">
            Elevate Affiliate
            <small>{market.code === "MYR" ? "Shopee Malaysia" : "Shopee Indonesia"}</small>
          </div>
          <div className="ea-spacer" />
          <button className="ea-icon-btn" type="button" onClick={onClose} aria-label="Tutup kartu">
            ×
          </button>
        </div>
        <div className="ea-body">
          {phase === "loading" && (
            <div className="ea-loading">
              <strong>Membaca produk…</strong>
              Harga dan nama diambil dari data yang dimuat halaman ini.
            </div>
          )}
          {phase === "error" && (
            <div className="ea-empty">
              <strong>Detail produk belum masuk.</strong>
              {detail ?? "Refresh halaman produk, lalu buka lagi kartunya."}
            </div>
          )}
          {phase === "ready" && item && commission && primary && (
            <>
              <h2 className="ea-name">{item.name}</h2>
              <div className="ea-meta">
                <span className="ea-price">{formatMoney(item.price, market)}</span>
                {item.shopName ? ` · ${item.shopName}` : ""}
                {item.sold ? ` · ${item.sold.toLocaleString("id-ID")} terjual` : ""}
              </div>
              <div className="ea-commission">
                <div>
                  <div className="ea-kicker">Komisi</div>
                  <div className="ea-amount">{formatMoney(commission.amount, market)}</div>
                </div>
                <span className={`ea-badge ${commission.source}`}>{formatRate(commission.ratePct)}</span>
              </div>
              <p className="ea-note">{commission.note}</p>
              <ProductMetrics item={item} market={market} />
              {(commission.promotedLast7d !== null || commission.freeSample !== null || commission.xtraRatePct) && (
                <div className="ea-facts">
                  {commission.promotedLast7d !== null && <span className="ea-chip">{commission.promotedLast7d} affiliate / 7 hari</span>}
                  {commission.freeSample !== null && (
                    <span className="ea-chip">{commission.freeSample ? "Ada sample gratis" : "Tanpa sample gratis"}</span>
                  )}
                  {commission.xtraRatePct ? <span className="ea-chip">Xtra {formatRate(commission.xtraRatePct)}</span> : null}
                </div>
              )}
              <div className="ea-actions">
                <button className="ea-btn primary" type="button" onClick={onCopyLink}>
                  {linkLabel}
                </button>
                <button
                  className="ea-btn"
                  type="button"
                  onClick={() => {
                    void onCopyCaption(primary.text);
                    flash("Caption disalin");
                  }}
                >
                  Salin caption
                </button>
              </div>
              {(onShare || onZip || onSummarize || onThread || onRank) && (
                <div className="ea-actions">
                  {onShare && (
                    <button className="ea-btn" type="button" onClick={onShare}>
                      Kartu 4:5
                    </button>
                  )}
                  {onZip && (
                    <button className="ea-btn" type="button" onClick={onZip}>
                      Zip gambar
                    </button>
                  )}
                  {onSummarize && (
                    <button className="ea-btn" type="button" onClick={onSummarize}>
                      Ringkas
                    </button>
                  )}
                  {onThread && (
                    <button className="ea-btn" type="button" onClick={() => onThread(angle)}>
                      Generate angle
                    </button>
                  )}
                  {onRank && (
                    <button className="ea-btn" type="button" onClick={onRank}>
                      Peringkat varian
                    </button>
                  )}
                </div>
              )}
              {panel && (
                <div className="ea-ai-panel">
                  <div className="ea-kicker" style={{ marginTop: 10 }}>
                    {panel.title}
                  </div>
                  {panel.owner ? <span className="ea-chip">{panel.owner}</span> : null}
                  {panel.parts && panel.parts.length > 0 ? (
                    panel.parts.map((part, index) => (
                      <div key={`${index}-${part.slice(0, 24)}`} className="ea-part">
                        <div className="ea-part-head">
                          <span>Part {index + 1}</span>
                          <button
                            className="ea-btn"
                            type="button"
                            onClick={() => {
                              void onCopyCaption(part);
                              flash(`Part ${index + 1} disalin`);
                            }}
                          >
                            Salin
                          </button>
                        </div>
                        <p>{part}</p>
                      </div>
                    ))
                  ) : (
                    <div className="ea-panel-text">{panel.body}</div>
                  )}
                  {panel.ai ? <p className="ea-note">Dibuat otomatis oleh AI, selalu baca ulang dan sesuaikan sebelum diposting.</p> : null}
                </div>
              )}
              {ranking}
              <div className="ea-caption">
                <div className="ea-kicker" style={{ marginTop: 10 }}>
                  Thread Affiliate
                </div>
                <select aria-label="Angle thread" value={angle} onChange={(event) => setAngle(event.target.value as ThreadAngle)}>
                  {THREAD_ANGLES.map((entry) => (
                    <option key={entry.key} value={entry.key}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <p>{localThread(item, market, angle)}</p>
                <button
                  className="ea-btn"
                  type="button"
                  onClick={() => {
                    void onCopyCaption(localThread(item, market, angle));
                    flash("Thread disalin");
                  }}
                >
                  Salin thread
                </button>
                <button className="ea-btn" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
                  {open ? "Tutup 3 angle" : "Lihat 3 angle caption"}
                </button>
                {open &&
                  captions.map((caption) => (
                    <div key={caption.id}>
                      <div className="ea-kicker" style={{ marginTop: 10 }}>
                        {caption.label}
                      </div>
                      <p>{caption.text}</p>
                      <button
                        className="ea-btn"
                        type="button"
                        onClick={() => {
                          void onCopyCaption(caption.text);
                          flash(`Angle ${caption.label} disalin`);
                        }}
                      >
                        Salin angle ini
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
          {copied && <div className="ea-status">{copied}</div>}
          {!copied && detail && phase === "ready" && <div className={`ea-status ${detail.startsWith("Sesi") ? "warn" : ""}`}>{detail}</div>}
        </div>
      </aside>
    </div>
  );
}
