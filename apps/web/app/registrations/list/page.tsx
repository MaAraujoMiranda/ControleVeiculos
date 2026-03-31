"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { api, getErrorMessage } from "../../../lib/api";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";
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

function getRegistrationPhoto(reg: RegistrationRecord) {
  return reg.vehicle.photoUrl ?? reg.vehicle2?.photoUrl ?? null;
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
  const [deleteTarget, setDeleteTarget] = useState<RegistrationRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

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
                <th className="w-[126px]">Ações</th>
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
                        {getRegistrationPhoto(reg) ? (
                          <img
                            src={getRegistrationPhoto(reg) ?? ""}
                            alt={`Foto do veículo de ${reg.client.name || "cliente"}`}
                            className="h-9 w-9 shrink-0 rounded-lg border border-[var(--border)] object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                            {reg.client.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{reg.client.name}</p>
                          {(reg.client.company || reg.client.clientType) && (
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--muted)]">
                              {reg.client.company && <span>{reg.client.company}</span>}
                              {reg.client.company && reg.client.clientType && (
                                <span aria-hidden> - </span>
                              )}
                              {reg.client.clientType && <span>{reg.client.clientType}</span>}
                            </div>
                          )}
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
                      <div className="flex min-w-[106px] flex-wrap items-center gap-1">
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
                          {reg.status === "ACTIVE" ? (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                              <path d="M7 1.5v5" />
                              <path d="M3 3.5a5 5 0 107.9 0" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                              <path d="M7 1.5v5" />
                              <path d="M3 3.5a5 5 0 107.9 0" />
                            </svg>
                          )}
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
