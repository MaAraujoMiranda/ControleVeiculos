"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getErrorMessage } from "../lib/api";
import { useAuth } from "./auth-provider";
import { ThemeToggle } from "./theme-toggle";

/* ── Icons ──────────────────────────────────────────────────── */

function IconGrid() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="10" y="1.5" width="5.5" height="5.5" rx="1.5" />
      <rect x="1.5" y="10" width="5.5" height="5.5" rx="1.5" />
      <rect x="10" y="10" width="5.5" height="5.5" rx="1.5" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="6.5" cy="5.5" r="2.5" />
      <path d="M1 14.5v-.5A5.5 5.5 0 0112 14v.5" />
      <path d="M12.5 3.5a2.5 2.5 0 010 4" />
      <path d="M16 14.5v-.5a5 5 0 00-2.5-4.33" />
    </svg>
  );
}

function IconCar() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 8.5L4 4.5h9l1.5 4" />
      <rect x="1" y="8.5" width="15" height="5" rx="2" />
      <circle cx="4.5" cy="13.5" r="1.25" />
      <circle cx="12.5" cy="13.5" r="1.25" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="1" y="3.5" width="15" height="10" rx="2" />
      <path d="M1 7.5h15" />
      <path d="M4 11.5h2.5M9.5 11.5h3.5" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8.5" cy="8.5" r="2.5" />
      <path d="M8.5 1.5v1.25M8.5 14.25V15.5M1.5 8.5H2.75M14.25 8.5H15.5M3.55 3.55l.88.88M12.57 12.57l.88.88M12.57 4.43l.88-.88M3.55 13.45l.88-.88" />
    </svg>
  );
}

function IconLogout() {
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
      <path d="M10.5 11.5v1a2 2 0 01-2 2h-5a2 2 0 01-2-2v-9a2 2 0 012-2h5a2 2 0 012 2v1" />
      <path d="M7 8h7.5M12 5.5L14.5 8 12 10.5" />
    </svg>
  );
}

/* ── Nav items ──────────────────────────────────────────────── */

const navItems = [
  { href: "/", label: "Painel", icon: IconGrid },
  { href: "/registrations", label: "Cadastros", icon: IconCard },
  { href: "/settings", label: "Configurações", icon: IconGear },
];

/* ── Component ──────────────────────────────────────────────── */

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading, logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const isLoginPage = pathname === "/login";

  const userRoleLabel =
    session?.user.role === "ADMIN"
      ? "Administrador"
      : session?.user.role === "OPERATOR"
        ? "Operador"
        : "Consulta";

  const userInitials = session?.user.name
    ? session.user.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "??";

  useEffect(() => {
    if (!loading && !session && !isLoginPage) router.replace("/login");
    if (!loading && session && isLoginPage) router.replace("/");
  }, [isLoginPage, loading, router, session]);

  async function handleLogout() {
    setLogoutError(null);
    try {
      await logout();
      router.replace("/login");
    } catch (err) {
      setLogoutError(getErrorMessage(err));
    }
  }

  if (isLoginPage) return <>{children}</>;

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="app-panel app-rise-in flex max-w-xs flex-col items-center gap-4 p-8 text-center">
          <div
            className="h-8 w-8 rounded-full border-2 border-[var(--accent)] border-t-transparent"
            style={{ animation: "spin 0.75s linear infinite" }}
          />
          <div>
            <p className="font-semibold text-[var(--foreground)]">
              Validando sessão
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Aguarde um momento...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* ── Sidebar desktop ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-xs font-bold text-white">
            CV
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--foreground)]">
              Controle de Veículos
            </p>
            <p className="text-[11px] text-[var(--muted)]">
              Sistema operacional
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          <p className="mb-2 mt-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--subtle)]">
            Navegação
          </p>

          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                }`}
              >
                <span
                  className={`transition-colors ${
                    active
                      ? "text-[var(--accent)]"
                      : "text-[var(--subtle)] group-hover:text-[var(--muted)]"
                  }`}
                >
                  <Icon />
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-[var(--border)] p-2.5 space-y-1">
          <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {session.user.name}
              </p>
              <p className="text-[11px] text-[var(--muted)]">{userRoleLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)] transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <IconLogout />
            Sair do sistema
          </button>

          {logoutError && (
            <p className="px-2.5 text-xs text-[var(--danger)]">{logoutError}</p>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white">
            CV
          </div>
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Controle de Veículos
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--border)] bg-[var(--surface)] px-1 py-2 lg:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-colors ${
                active
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main content ── */}
      <main className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <div className="flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-8 lg:pb-8 lg:pt-6 app-rise-in max-w-400 w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
