"use client";

import { useEffect } from "react";
import { applyTheme, loadTheme, THEMES } from "../../lib/themes";

export default function ApplyTheme() {
  useEffect(() => {
    const id = loadTheme();
    applyTheme(id);
    try {
      const bg = THEMES.find((t) => t.id === id)?.swatches[0] || "#fff7ff";
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", bg);
    } catch {}
  }, []);
  return null;
}
