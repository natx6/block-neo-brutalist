"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";
import { clearTracks, listTracks } from "../../lib/db";
import { loadSettings, storeSettings, type Settings } from "../../lib/downloads";
import { usePlayer } from "../../lib/player-context";
import { THEMES, applyTheme, loadTheme } from "../../lib/themes";

const QUALITIES = ["Lite", "Good", "Best"];

export default function SettingsPage() {
  const { offlineMode, setOfflineMode } = usePlayer();
  const [settings, setSettings] = useState<Settings>({ quality: "Good", wifiOnly: true, offlineMode: false, sleepOn: true });
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState("puff");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    setTheme(loadTheme());
  }, []);

  useEffect(() => {
    setSettings((prev) => (prev.offlineMode === offlineMode ? prev : { ...prev, offlineMode }));
  }, [offlineMode]);

  const update = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      storeSettings(next);
      return next;
    });
    setNotice("");
  };

  const qualityIndex = Math.max(0, QUALITIES.indexOf(settings.quality));

  const handleOffline = (v: boolean) => {
    update({ offlineMode: v });
    setOfflineMode(v);
  };

  const handleTheme = (id: string) => {
    applyTheme(id);
    setTheme(id);
  };

  const handleClear = async () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all downloads?")) return;
    const count = (await listTracks().catch(() => [] as Awaited<ReturnType<typeof listTracks>>)).length;
    await clearTracks().catch(() => {});
    setNotice(`Cleared ${count} downloads`);
  };

  return (
    <div className="t-bg min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe t-bg-80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center gap-2">
          <Link href="/" className="w-11 h-11 rounded-full t-container clay-card flex items-center justify-center min-w-[44px]">‹</Link>
          <h1 className="font-display font-bold text-[18px]">Settings</h1>
        </div>
      </header>
      <main className="flex-1 pt-20 pb-10 px-5 flex flex-col gap-4">
        <div className="t-card rounded-2xl p-4 clay-card">
          <p className="font-display font-bold mb-1">Theme</p>
          <p className="text-[12px] t-muted mb-3">Pick a look for Puff</p>
          <div className="flex flex-col gap-2">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTheme(t.id)}
                  aria-pressed={active}
                  className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left min-h-[56px] ${active ? "t-primary-ct clay-button-active" : "t-surface clay-card"}`}
                >
                  <span className="flex -space-x-1.5 shrink-0">
                    {t.swatches.map((s) => (
                      <span
                        key={s}
                        className="w-6 h-6 rounded-full clay-thumb border border-white/60"
                        style={{ background: s }}
                      />
                    ))}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-display font-bold text-[14px] block">{t.name}</span>
                    <span className="text-[12px] t-muted block">{t.desc}</span>
                  </span>
                  {active && <Icon name="check" className="text-[22px] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="t-card rounded-2xl p-4 clay-card">
          <p className="font-display font-bold mb-3">Audio quality</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITIES.map((q, i) => (
              <button
                key={q}
                onClick={() => update({ quality: q })}
                className={`h-12 rounded-full font-display font-bold min-h-[48px] ${qualityIndex === i ? "t-primary-ct clay-button-active" : "t-surface clay-card t-muted"}`}
              >
                {q}
              </button>
            ))}
          </div>
          <p className="text-[12px] mt-2 t-muted">Lite ~128kbps • Good ~256kbps • Best ~FLAC</p>
        </div>

        {[
          { label: "Wi-Fi only downloads", sub: "Pause on cellular", val: settings.wifiOnly, set: (v: boolean) => update({ wifiOnly: v }) },
          { label: "Offline mode", sub: "Only play downloaded tunes", val: settings.offlineMode, set: handleOffline },
          { label: "Sleep timer", sub: "Stop after 30 minutes", val: settings.sleepOn, set: (v: boolean) => update({ sleepOn: v }) },
        ].map((r) => (
          <div key={r.label} className="t-card rounded-2xl p-4 clay-card flex items-center justify-between">
            <div><p className="font-display font-bold">{r.label}</p><p className="text-[12px] t-muted">{r.sub}</p></div>
            <button onClick={() => r.set(!r.val)} role="switch" aria-checked={r.val} className={`w-12 h-7 rounded-full p-0.5 ${r.val ? "t-primary-ct" : "t-variant"}`}>
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${r.val ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}

        <button onClick={handleClear} className="h-14 rounded-full t-tertiary-ct font-display font-bold clay-card min-h-[56px] flex items-center justify-center gap-2">
          <Icon name="delete" /> Clear downloads
        </button>
        {notice && <p className="text-[12px] text-center font-bold">{notice}</p>}
        <p className="text-[12px] text-center t-muted">Puff v1 • local-first: audio on device, library index syncs for re-download.</p>
      </main>
    </div>
  );
}
