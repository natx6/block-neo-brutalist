"use client";

import { useEffect } from "react";
import { applyTheme, loadTheme } from "../../lib/themes";

export default function ApplyTheme() {
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);
  return null;
}
