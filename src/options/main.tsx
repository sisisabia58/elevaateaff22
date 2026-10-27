import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadSettings, saveSettings } from "../shared/settings";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types";
import { OptionsView } from "../ui/OptionsView";

function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then((value) => {
      setSettings(value);
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  return (
    <OptionsView
      settings={settings}
      savedLabel={savedLabel}
      onChange={(next) => {
        setSettings(next);
        void saveSettings(next).then(() => {
          setSavedLabel("Tersimpan di browser ini.");
          window.setTimeout(() => setSavedLabel(null), 1600);
        });
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(<OptionsApp />);
