"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, getErrorMessage } from "../lib/api";
import { formatDateTime, formatStatusLabel } from "../lib/format";
import type { PaginationMeta, RegistrationRecord } from "../lib/types";

type Status = RegistrationRecord["status"];

/* ── Badge de status ────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:
      "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",
    BLOCKED:
      "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    INACTIVE:
      "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]",
  };
  return (
    <span className={`app-badge ${map[status] ?? map.INACTIVE}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

/* ── Ícone de busca ─────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7.5" cy="7.5" r="5.5" />
      <path d="M16.5 16.5l-4-4" />
    </svg>
  );
}

/* ── Página ─────────────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [totals, setTotals] = useState({
    clients: 0,
    vehicles: 0,
    registrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    reg: RegistrationRecord;
    top: number;
    right: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, reg: RegistrationRecord) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ reg, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

  /* Busca + totais iniciais */
  async function search(q = query) {
    setLoading(true);
    setError(null);

    try {
      const [regsRes, clientsRes, vehiclesRes] = await Promise.all([
        api.listRegistrations({ q: q || undefined, pageSize: 30 }),
        api.listClients({ pageSize: 1 }),
        api.listVehicles({ pageSize: 1 }),
      ]);

      setRecords(regsRes.data);
      setMeta(regsRes.meta);
      setTotals({
        clients: clientsRes.meta.total,
        vehicles: vehiclesRes.meta.total,
        registrations: regsRes.meta.total,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(reg: RegistrationRecord) {
    const next: Status =
      reg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setRecords((prev) =>
      prev.map((r) => (r.id === reg.id ? { ...r, status: next } : r)),
    );
    try {
      await api.updateRegistration(reg.id, { status: next });
    } catch {
      setRecords((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, status: reg.status } : r)),
      );
    }
  }

  /* Carga inicial */
  useEffect(() => {
    void search("");
    inputRef.current?.focus();
  }, []);

  /* Debounce de busca */
  useEffect(() => {
    const timer = setTimeout(() => {
      void search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* ── Menu dropdown fixo ── */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 min-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
            style={{ top: menu.top, right: menu.right }}
          >
            <Link
              href={`/registrations/${menu.reg.id}`}
              onClick={() => setMenu(null)}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
            >
              Visualizar
            </Link>
            <Link
              href={`/registrations?edit=${menu.reg.id}`}
              onClick={() => setMenu(null)}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
            >
              Editar
            </Link>
            <button
              type="button"
              onClick={() => { void toggleStatus(menu.reg); setMenu(null); }}
              className={`flex w-full items-center px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-[var(--surface-strong)] ${
                menu.reg.status === "ACTIVE" ? "text-[var(--danger)]" : "text-[var(--success)]"
              }`}
            >
              {menu.reg.status === "ACTIVE" ? "Desativar" : "Ativar"}
            </button>
          </div>
        </>
      )}
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Painel
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Busque por cliente, empresa, placa (incluindo 2º veículo), cartão ou TR SL.
          </p>
        </div>

        {/* Contadores rápidos */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Clientes", value: totals.clients },
            { label: "Veículos", value: totals.vehicles },
            { label: "Cadastros", value: totals.registrations },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-center"
            >
              <p className="text-lg font-bold leading-none text-[var(--foreground)]">
                {loading ? "—" : item.value}
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Barra de busca principal ── */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--muted)]">
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-11 pr-4 text-base text-[var(--foreground)] outline-none placeholder:text-[var(--subtle)] transition-all focus:border-[var(--accent)] focus:ring-0"
          style={{
            boxShadow: query
              ? "0 0 0 3px var(--accent-soft)"
              : "0 1px 3px rgba(0,0,0,0.05)",
          }}
          placeholder="Buscar por nome, empresa, placa, cartão, CPF ou TR SL..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="absolute inset-y-0 right-3 flex items-center px-2 text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Limpar busca"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        )}
      </div>

      {error && <div className="app-status-error">{error}</div>}

      {/* ── Resultados ── */}
      <div className="app-panel p-0 overflow-hidden">
        {/* Cabeçalho da lista */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p
              className="font-semibold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {isSearching
                ? `Resultados para "${query}"`
                : "Cadastros recentes"}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {loading
                ? "Buscando..."
                : `${meta?.total ?? 0} ${meta?.total === 1 ? "registro" : "registros"} encontrado${meta?.total === 1 ? "" : "s"}`}
            </p>
          </div>

          <Link href="/registrations" className="app-button-primary text-sm">
            + Novo cadastro
          </Link>
        </div>

        {/* Lista */}
        {records.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)]">
              <SearchIcon />
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">
                {isSearching
                  ? "Nenhum resultado encontrado"
                  : "Nenhum cadastro ainda"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {isSearching
                  ? `Tente buscar por outro nome, empresa, placa ou cartão.`
                  : `Clique em "+ Novo cadastro" para começar.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {loading && records.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-[var(--surface-strong)] animate-pulse" />
                    <div className="h-3 w-24 rounded bg-[var(--surface-strong)] animate-pulse" />
                  </div>
                </div>
              ))
            ) : (
              records.map((reg) => (
                <div
                  key={reg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/registrations/${reg.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/registrations/${reg.id}`); }}
                  className="group flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-strong)] sm:flex-row sm:items-center sm:justify-between"
                >
                  {/* Cliente + veículo */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                      {reg.client.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--foreground)] truncate">
                        {reg.client.name}{reg.client.company ? ` — ${reg.client.company}` : ""}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
                        <span className="font-mono font-semibold text-[var(--foreground)]">
                          {reg.vehicle.plate}
                        </span>
                        {reg.vehicle2?.plate && (
                          <span className="font-mono font-semibold text-[var(--foreground)]">
                            {reg.vehicle2.plate}
                          </span>
                        )}
                        {reg.vehicle.brandModel && (
                          <span>{reg.vehicle.brandModel}</span>
                        )}
                        <span>{formatDateTime(reg.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cartão + status + menu */}
                  <div className="flex items-center gap-3 sm:shrink-0">
                    {reg.cardNumber && (
                      <span className="hidden text-xs text-[var(--muted)] sm:block">
                        Cartão{" "}
                        <span className="font-mono font-semibold text-[var(--foreground)]">
                          {reg.cardNumber}
                        </span>
                      </span>
                    )}

                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-[var(--muted)]">Status</span>
                      <StatusBadge status={reg.status} />
                    </span>

                    {/* Menu três pontinhos */}
                    <button
                      type="button"
                      onClick={(e) => openMenu(e, reg)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                      aria-label="Ações"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                        <circle cx="2" cy="7" r="1.25" />
                        <circle cx="7" cy="7" r="1.25" />
                        <circle cx="12" cy="7" r="1.25" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rodapé com link se houver mais */}
        {meta && meta.hasNextPage && (
          <div className="border-t border-[var(--border)] px-5 py-3 text-center">
            <Link
              href="/registrations"
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Ver todos os {meta.total} cadastros →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
