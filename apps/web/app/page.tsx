"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "../components/confirm-dialog";
import { api, getErrorMessage } from "../lib/api";
import { formatDateTime, formatStatusLabel } from "../lib/format";
import type { PaginationMeta, RegistrationRecord } from "../lib/types";

type Status = RegistrationRecord["status"];
type DashboardStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const DASHBOARD_STATUS_FILTER_KEY = "controle-veiculos:dashboard-status-filter";

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

function getRegistrationVehicles(reg: RegistrationRecord) {
  return [
    { plate: reg.vehicle.plate, brandModel: reg.vehicle.brandModel },
    ...(reg.vehicle2
      ? [{ plate: reg.vehicle2.plate, brandModel: reg.vehicle2.brandModel }]
      : []),
  ];
}

function getRegistrationPhoto(reg: RegistrationRecord) {
  return reg.vehicle.photoUrl ?? reg.vehicle2?.photoUrl ?? null;
}

function getClientSubtitle(
  company?: string | null,
  clientType?: string | null,
  clientModality?: string | null,
) {
  return [company, clientType, clientModality].filter(Boolean).join(" - ");
}

function RowActionButton({
  title,
  tone = "default",
  onClick,
  children,
}: {
  title: string;
  tone?: "default" | "success" | "danger";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-[var(--success)] hover:bg-[var(--success-soft)]"
      : tone === "danger"
        ? "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
        : "text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-colors sm:h-8 sm:w-8 ${toneClass}`}
    >
      {children}
    </button>
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
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>("ALL");
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [totals, setTotals] = useState({
    activeClients: 0,
    inactiveClients: 0,
    vehicles: 0,
    registrations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Busca + totais iniciais */
  async function search(q = query) {
    setLoading(true);
    setError(null);

    try {
      const [regsRes, statsRes] = await Promise.all([
        api.listRegistrations({
          q: q || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          pageSize: 30,
        }),
        api.getDashboardStats(),
      ]);

      setRecords(regsRes.data);
      setMeta(regsRes.meta);
      setTotals({
        activeClients: statsRes.activeClients,
        inactiveClients: statsRes.inactiveClients,
        vehicles: statsRes.vehicles,
        registrations: statsRes.registrations,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    setDeleting(true);

    try {
      await api.deleteRegistration(id);
      setDeleteTarget(null);
      setSuccess("Cadastro removido com sucesso.");
      await search(query);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
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
      await search(query);
    } catch {
      setRecords((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, status: reg.status } : r)),
      );
    }
  }

  /* Carga inicial */
  useEffect(() => {
    const persistedFilter = window.localStorage.getItem(
      DASHBOARD_STATUS_FILTER_KEY,
    ) as DashboardStatusFilter | null;

    if (
      persistedFilter === "ALL" ||
      persistedFilter === "ACTIVE" ||
      persistedFilter === "INACTIVE"
    ) {
      setStatusFilter(persistedFilter);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_STATUS_FILTER_KEY, statusFilter);
  }, [statusFilter]);

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
  }, [query, statusFilter]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir cadastro"
        description="Tem certeza que deseja excluir este cadastro? Esta ação remove o registro e os dados vinculados."
        confirmLabel="Excluir cadastro"
        cancelLabel="Cancelar"
        variant="danger"
        busy={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget.id);
          }
        }}
      />

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
            { label: "Clientes ativos", value: totals.activeClients },
            { label: "Clientes inativos", value: totals.inactiveClients },
            { label: "Veículos totais", value: totals.vehicles },
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
      {success && <div className="app-status-success">{success}</div>}

      {/* ── Resultados ── */}
      <div className="app-panel p-0 overflow-hidden">
        {/* Cabeçalho da lista */}
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
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

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              className="app-select mt-0 h-10 w-full shrink-0 text-sm sm:w-[190px]"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as DashboardStatusFilter)
              }
            >
              <option value="ALL">Todos os status</option>
              <option value="ACTIVE">Somente ativos</option>
              <option value="INACTIVE">Somente inativos</option>
            </select>
            <Link
              href="/registrations"
              className="app-button-primary w-full text-center text-sm sm:w-auto"
            >
              + Novo cadastro
            </Link>
          </div>
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
                    {getRegistrationPhoto(reg) ? (
                      <img
                        src={getRegistrationPhoto(reg) ?? ""}
                        alt={`Foto do veículo de ${reg.client.name || "cliente"}`}
                        className="h-10 w-10 shrink-0 rounded-lg border border-[var(--border)] object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                        {reg.client.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--foreground)] truncate">
                        {reg.client.name}{reg.client.company ? ` — ${reg.client.company}` : ""}
                      </p>
                      {getClientSubtitle(
                        reg.client.company,
                        reg.client.clientType,
                        reg.client.clientModality,
                      ) && (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {getClientSubtitle(
                            reg.client.company,
                            reg.client.clientType,
                            reg.client.clientModality,
                          )}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {getRegistrationVehicles(reg).map((vehicle, index) => (
                          <span key={`${reg.id}-vehicle-${index}`}>
                            {index > 0 ? ", " : ""}
                            <span className="font-mono font-semibold text-[var(--foreground)]">
                              {vehicle.plate}
                            </span>
                            {vehicle.brandModel ? ` ${vehicle.brandModel}` : ""}
                          </span>
                        ))}
                        {" - "}
                        {formatDateTime(reg.updatedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Cartão + status + ações */}
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                    {reg.cardNumber && (
                      <span className="text-xs text-[var(--muted)] sm:block">
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

                    <div className="flex items-center gap-1">
                      <RowActionButton
                        title="Editar cadastro"
                        onClick={() => router.push(`/registrations?edit=${reg.id}`)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <path d="M2 9.8V12h2.2l6.4-6.4-2.2-2.2L2 9.8z" />
                          <path d="M7.9 2.8l2.2 2.2" />
                        </svg>
                      </RowActionButton>
                      <RowActionButton
                        title={reg.status === "ACTIVE" ? "Desativar cadastro" : "Ativar cadastro"}
                        tone={reg.status === "ACTIVE" ? "danger" : "success"}
                        onClick={() => {
                          void toggleStatus(reg);
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <path d="M7 1.5v5" />
                          <path d="M3 3.5a5 5 0 107.9 0" />
                        </svg>
                      </RowActionButton>
                      <RowActionButton
                        title="Excluir cadastro"
                        tone="danger"
                        onClick={() => setDeleteTarget(reg)}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                          <path d="M2 3.5h10" />
                          <path d="M5 3.5v-1h4v1" />
                          <path d="M4 4.5l.4 7h5.2l.4-7" />
                        </svg>
                      </RowActionButton>
                    </div>
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
              href="/registrations/list"
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
