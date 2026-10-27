import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { loadSession, signInWithGoogle, signOut } from "../shared/auth";
import { loadSettings, saveSettings } from "../shared/settings";
import { DEFAULT_SETTINGS, type Settings } from "../shared/types";
import { OptionsView } from "../ui/OptionsView";

function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authNote, setAuthNote] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings().then((value) => {
      setSettings(value);
      setReady(true);
    });
    void loadSession().then((session) => setEmail(session?.email ?? null));
  }, []);

  if (!ready) return null;

  return (
    <OptionsView
      settings={settings}
      savedLabel={savedLabel}
      email={email}
      authNote={authNote}
      onChange={(next) => {
        setSettings(next);
        void saveSettings(next).then(() => {
          setSavedLabel("Tersimpan di browser ini.");
          window.setTimeout(() => setSavedLabel(null), 1600);
        });
      }}
      onSignIn={() => {
        setAuthNote("Membuka login Google…");
        void signInWithGoogle()
          .then((session) => {
            setEmail(session.email ?? null);
            setAuthNote(session.email ? null : "Masuk, email belum terbaca. Coba sekali lagi.");
          })
          .catch((error: unknown) => {
            setAuthNote(error instanceof Error ? error.message : "Login gagal.");
          });
      }}
      onSignOut={() => {
        void signOut().then(() => {
          setEmail(null);
          setAuthNote("Keluar dari akun tim di browser ini.");
        });
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(<OptionsApp />);
