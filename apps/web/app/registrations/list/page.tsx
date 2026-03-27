"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useState } from "react";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { api, getErrorMessage } from "../../../lib/api";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";
import { getMenuPosition } from "../../../lib/menu-position";
import type { PaginationMeta, RegistrationRecord } from "../../../lib/types";

const statusOptions = ["ACTIVE", "INACTIVE"] as const;
const REGISTRATIONS_PAGE_SIZE = 30;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:
      "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",
    BLOCKED:
      "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    INACTIVE: "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]",
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

export default function RegistrationsListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    reg: RegistrationRecord;
    top: number;
    left: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openMenu(e: MouseEvent<HTMLButtonElement>, reg: RegistrationRecord) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const position = getMenuPosition(rect, 180, 196);
    setMenu({ reg, ...position });
  }

  async function loadRegistrations() {
    setLoading(true);
    setError(null);

    try {
      const res = await api.listRegistrations({
        q: search || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: REGISTRATIONS_PAGE_SIZE,
      });

      const maxPage = res.meta.pageCount > 0 ? res.meta.pageCount : 1;
      if (page > maxPage) {
        setPage(maxPage);
        return;
      }

      setRecords(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistrations();
  }, [search, page, statusFilter]);

  async function toggleStatus(reg: RegistrationRecord) {
    const next = reg.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
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

  async function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      await api.deleteRegistration(id);
      setDeleteTarget(null);
      setSuccess("Cadastro removido.");
      await loadRegistrations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const recordsStart = meta && meta.total > 0 ? (meta.page - 1) * meta.pageSize + 1 : 0;
  const recordsEnd = meta && meta.total > 0 ? Math.min(meta.page * meta.pageSize, meta.total) : 0;

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    if (!meta?.hasNextPage) return;
    setPage((current) => current + 1);
  }

  return (
    <div className="space-y-5">
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

      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-[180px] max-w-[calc(100vw-1rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
            style={{ top: menu.top, left: menu.left }}
          >
            <Link
              href={`/registrations/${menu.reg.id}`}
              onClick={() => setMenu(null)}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
            >
              Visualizar
            </Link>
            <button
              type="button"
              onClick={() => {
                router.push(`/registrations?edit=${menu.reg.id}`);
                setMenu(null);
              }}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                void toggleStatus(menu.reg);
                setMenu(null);
              }}
              className={`flex w-full items-center px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-strong)] ${
                menu.reg.status === "ACTIVE" ? "text-[var(--danger)]" : "text-[var(--success)]"
              }`}
            >
              {menu.reg.status === "ACTIVE" ? "Desativar" : "Ativar"}
            </button>
            <div className="my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={() => {
                setDeleteTarget(menu.reg);
                setMenu(null);
              }}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
            >
              Excluir
            </button>
          </div>
        </>
      )}

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cadastros
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Lista completa com filtros, busca e paginação.
          </p>
        </div>
        <Link href="/registrations" className="app-button-primary text-sm">
          + Novo cadastro
        </Link>
      </div>

      {error && <div className="app-status-error">{error}</div>}
      {success && <div className="app-status-success">{success}</div>}

      <div className="app-panel min-w-0 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p
              className="text-lg font-bold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cadastros
            </p>
            <p className="text-sm text-[var(--muted)]">
              Busca por nome, empresa, placa (incluindo 2º veículo), cartão ou TR SL.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              className="app-input mt-0 w-full sm:min-w-[280px]"
              placeholder="Buscar por nome, empresa, placa, cartão ou TR SL..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="app-select mt-0 w-full shrink-0 sm:w-44"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os status</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {formatStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="app-table-shell">
          <table className="app-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th className="hidden sm:table-cell">Cartão / TR SL</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-[var(--muted)]"
                  >
                    {loading
                      ? "Carregando cadastros..."
                      : "Nenhum cadastro encontrado."}
                  </td>
                </tr>
              ) : (
                records.map((reg) => (
                  <tr
                    key={reg.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/registrations/${reg.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/registrations/${reg.id}`);
                      }
                    }}
                    className="cursor-pointer hover:bg-[var(--surface-strong)]"
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                          {reg.client.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{reg.client.name}</p>
                          {reg.client.company && (
                            <p className="text-xs text-[var(--muted)]">
                              {reg.client.company}
                            </p>
                          )}
                          <p className="text-xs text-[var(--muted)]">
                            {reg.client.cpf}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td>
                      <p className="text-xs text-[var(--muted)]">
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
                    </td>

                    <td className="hidden sm:table-cell">
                      <p className="font-mono text-sm">
                        {reg.cardNumber || "—"}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        TR: {reg.trSl || "—"}
                      </p>
                    </td>

                    <td>
                      <StatusBadge status={reg.status} />
                    </td>

                    <td>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--muted)]">
              {meta.total === 0
                ? "Nenhum registro para exibir."
                : `Mostrando ${recordsStart} a ${recordsEnd} de ${meta.total} registros`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="app-button-secondary px-3 py-2 text-xs"
                onClick={goToPreviousPage}
                disabled={loading || !meta.hasPreviousPage}
              >
                Anterior
              </button>

              <span className="text-xs font-medium text-[var(--muted)]">
                Página {meta.pageCount === 0 ? 0 : meta.page} de {meta.pageCount}
              </span>

              <button
                type="button"
                className="app-button-secondary px-3 py-2 text-xs"
                onClick={goToNextPage}
                disabled={loading || !meta.hasNextPage}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
