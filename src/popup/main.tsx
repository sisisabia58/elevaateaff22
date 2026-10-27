import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { buildCaptions } from "../shared/captions";
import { commissionView } from "../shared/commission";
import { marketFromHost } from "../shared/money";
import { loadSettings } from "../shared/settings";
import { classifyLocation } from "../shared/shopee";
import type { LiveCommission, PageKind, ScoutItem, Settings } from "../shared/types";
import { copyText } from "../ui/copy";
import { PopupView } from "../ui/PopupView";

type TabState = {
  kind: PageKind;
  label: string;
  item: ScoutItem | null;
  scoutCount: number;
  live: LiveCommission | null;
  href: string;
};

const EMPTY: TabState = { kind: "other", label: "Siap dipakai", item: null, scoutCount: 0, live: null, href: "" };

function PopupApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<TabState>(EMPTY);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const current = tabs[0];
      const href = current?.url ?? "";
      const kind = href ? classifyLocation(href) : "other";
      const next: TabState = { ...EMPTY, kind, href, label: kind === "other" ? "Bukan halaman Shopee" : "Membaca halaman…" };
      setTab(next);
      if (!current?.id || kind === "other") return;
      chrome.tabs.sendMessage(current.id, { type: "EA_GET_STATE" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          setTab({ ...next, label: kind === "product" ? "Halaman produk" : kind === "search" ? "Pencarian" : "Toko" });
          return;
        }
        const state = response as Partial<TabState>;
        setTab({
          kind: state.kind ?? kind,
          label: state.label || (kind === "search" ? "Pencarian" : "Toko"),
          item: state.item ?? null,
          scoutCount: state.scoutCount ?? 0,
          live: state.live ?? null,
          href,
        });
      });
    });
  }, []);

  if (!settings) return null;
  const market = marketFromHost(tab.href ? new URL(tab.href).hostname : "shopee.co.id");
  const commission = tab.item ? commissionView(tab.item, settings, tab.live) : null;

  return (
    <PopupView
      kind={tab.kind}
      label={tab.label}
      item={tab.item}
      scoutCount={tab.scoutCount}
      market={market}
      commission={commission}
      note={note}
      onOpenOptions={() => chrome.runtime.sendMessage({ type: "EA_OPEN_OPTIONS" })}
      onCopyCaption={() => {
        if (!tab.item) return;
        const caption = buildCaptions(tab.item, market, settings.tone)[0];
        void copyText(caption.text).then((ok) => setNote(ok ? "Caption disalin." : "Clipboard ditolak browser."));
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(<PopupApp />);
