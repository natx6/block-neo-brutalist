"use client";

import { useEffect, useState } from "react";
import { loadTheme, themeIcon } from "../../lib/themes";

/** App mascot that follows the active theme (falls back to the Puff icon). */
export default function AppIcon({ className = "" }: { className?: string }) {
  const [src, setSrc] = useState("/icons/icon-puff.png");
  useEffect(() => {
    setSrc(themeIcon(loadTheme()));
    const onTheme = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setSrc(themeIcon(id));
    };
    window.addEventListener("puff-theme", onTheme);
    return () => window.removeEventListener("puff-theme", onTheme);
  }, []);
  return (
    <img
      src={src}
      alt="Puff"
      className={`object-cover ${className}`}
      onError={(e) => {
        const el = e.target as HTMLImageElement;
        if (!el.src.endsWith("/icons/icon-puff.png")) {
          el.src = "/icons/icon-puff.png";
        } else {
          el.style.display = "none";
        }
      }}
    />
  );
}
