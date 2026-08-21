"use client";

import { useState } from "react";
import { MingcuteIcon } from "@/components/ui/mingcute-icon";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(() => typeof document === "undefined" ? "dark" : currentTheme());

  const toggleTheme = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem("adaptara-theme", next);
    setTheme(next);
  };

  const nextTheme = theme === "dark" ? "light" : "dark";
  return <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={`Use ${nextTheme} theme`} title={`Use ${nextTheme} theme`} suppressHydrationWarning>
    <MingcuteIcon name={theme === "dark" ? "sun" : "moon"} />
    {!compact ? <span>{theme === "dark" ? "Light" : "Dark"}</span> : null}
  </button>;
}
