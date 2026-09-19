"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "../components/Nav";
import { clearTracks, listTracks } from "../../lib/db";
import { loadSettings, storeSettings, type Settings } from "../../lib/downloads";
import { usePlayer } from "../../lib/player-context";

const QUALITIES = ["Lite", "Good", "Best"];

export default function SettingsPage() {
  const { offlineMode, setOfflineMode } = usePlayer();
  const [settings, setSettings] = useState<Settings>({ quality: "Good", wifiOnly: true, offlineMode: false, sleepOn: true });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
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

  const handleClear = async () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all downloads?")) return;
    const count = (await listTracks().catch(() => [] as Awaited<ReturnType<typeof listTracks>>)).length;
    await clearTracks().catch(() => {});
    setNotice(`Cleared ${count} downloads`);
  };

  return (
    <div className="bg-[#fff7ff] min-h-dvh max-w-[430px] mx-auto flex flex-col relative">
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#fff7ff]/80 backdrop-blur-xl">
        <div className="max-w-[430px] mx-auto h-16 px-5 flex items-center gap-2">
          <Link href="/" className="w-11 h-11 rounded-full bg-[#f6e9ff] clay-card flex items-center justify-center min-w-[44px]">‹</Link>
          <h1 className="font-display font-bold text-[18px]">Settings</h1>
        </div>
      </header>
      <main className="flex-1 pt-20 pb-10 px-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-4 clay-card">
          <p className="font-display font-bold mb-3">Audio quality</p>
          <div className="grid grid-cols-3 gap-2">
            {QUALITIES.map((q, i) => (
              <button
                key={q}
                onClick={() => update({ quality: q })}
                className={`h-12 rounded-full font-display font-bold min-h-[48px] ${qualityIndex === i ? "bg-[#d5c4ff] clay-button-active" : "bg-[#fbf0ff] clay-card text-[#49454e]"}`}
              >
                {q}
              </button>
            ))}
          </div>
          <p className="text-[12px] mt-2 text-[#49454e]">Lite ~128kbps • Good ~256kbps • Best ~FLAC</p>
        </div>

        {[
          { label: "Wi-Fi only downloads", sub: "Pause on cellular", val: settings.wifiOnly, set: (v: boolean) => update({ wifiOnly: v }) },
          { label: "Offline mode", sub: "Only play downloaded tunes", val: settings.offlineMode, set: handleOffline },
          { label: "Sleep timer", sub: "Stop after 30 minutes", val: settings.sleepOn, set: (v: boolean) => update({ sleepOn: v }) },
        ].map((r) => (
          <div key={r.label} className="bg-white rounded-2xl p-4 clay-card flex items-center justify-between">
            <div><p className="font-display font-bold">{r.label}</p><p className="text-[12px] text-[#49454e]">{r.sub}</p></div>
            <button onClick={() => r.set(!r.val)} role="switch" aria-checked={r.val} className={`w-12 h-7 rounded-full p-0.5 ${r.val ? "bg-[#d5c4ff]" : "bg-[#eedbff]"}`}>
              <div className={`w-6 h-6 rounded-full bg-white clay-thumb transition-transform ${r.val ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}

        <button onClick={handleClear} className="h-14 rounded-full bg-[#ffbbc2] font-display font-bold clay-card min-h-[56px] flex items-center justify-center gap-2">
          <Icon name="delete" /> Clear downloads
        </button>
        {notice && <p className="text-[12px] text-center font-bold">{notice}</p>}
        <p className="text-[12px] text-center text-[#49454e]">Puff v1 • local-first: audio on device, library index syncs for re-download.</p>
      </main>
    </div>
  );
}
