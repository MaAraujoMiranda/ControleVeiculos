"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribe() {
  return () => undefined;
}

function getThemePreference(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem("controle-theme");
  if (stored === "dark" || stored === "light") return stored;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="2.75" />
      <path d="M8 1.5v1.25M8 13.25V14.5M1.5 8h1.25M13.25 8H14.5M3.2 3.2l.88.88M11.92 11.92l.88.88M11.92 4.08l.88-.88M3.2 12.8l.88-.88" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13.5 9A5.5 5.5 0 017 2.5a5.5 5.5 0 100 11 5.5 5.5 0 006.5-4.5z" />
    </svg>
  );
}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [theme, setTheme] = useState<Theme>(() => getThemePreference());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("controle-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const isDark = mounted ? theme === "dark" : false;
  const label = isDark ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
      onClick={toggleTheme}
      aria-label={mounted ? label : "Alternar tema"}
      title={mounted ? label : "Alternar tema"}
    >
      <span suppressHydrationWarning>
        {isDark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
