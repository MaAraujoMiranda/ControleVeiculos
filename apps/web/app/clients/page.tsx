"use client";

import {
  type FormEvent,
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";
import { api, getErrorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { ClientPayload, ClientRecord, PaginationMeta } from "../../lib/types";

const emptyForm: ClientPayload = {
  name: "",
  phone: "",
  cpf: "",
  photoUrl: "",
  notes: "",
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [records, setRecords] = useState<ClientRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [form, setForm] = useState<ClientPayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadClients() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.listClients({
        q: deferredSearch,
        pageSize: 20,
      });

      setRecords(response.data);
      setMeta(response.meta);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    startTransition(() => {
      setEditingId(null);
      setForm(emptyForm);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        cpf: form.cpf,
        photoUrl: form.photoUrl?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      if (editingId) {
        await api.updateClient(editingId, payload);
        setSuccess("Cliente atualizado com sucesso.");
      } else {
        await api.createClient(payload);
        setSuccess("Cliente criado com sucesso.");
      }

      resetForm();
      await loadClients();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Deseja remover este cliente? Os vinculos do cadastro tambem serao desativados.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await api.deleteClient(id);
      setSuccess("Cliente removido com sucesso.");
      if (editingId === id) {
        resetForm();
      }
      await loadClients();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  useEffect(() => {
    async function syncClients() {
      setLoading(true);
      setError(null);

      try {
        const response = await api.listClients({
          q: deferredSearch,
          pageSize: 20,
        });

        setRecords(response.data);
        setMeta(response.meta);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setLoading(false);
      }
    }

    void syncClients();
  }, [deferredSearch]);

  return (
    <div className="space-y-6 py-2">
      <section className="app-panel app-rise-in relative overflow-hidden">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <span className="app-badge">Cadastro de pessoas</span>
            <h2
              className="mt-4 text-4xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Clientes organizados com leitura clara e busca imediata.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
              Esta area concentra o cadastro principal de pessoas com uma
              estrutura direta para atendimento rapido e atualizacao sem ruído.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="app-panel-soft px-4 py-4 text-sm">
              <span className="text-[var(--muted)]">Total exibido</span>
              <div className="mt-2 text-2xl font-semibold">
                {loading ? "..." : meta?.total ?? 0}
              </div>
            </div>
            <div className="app-panel-soft px-4 py-4 text-sm">
              <span className="text-[var(--muted)]">Obrigatorios</span>
              <div className="mt-2 font-semibold">Nome, telefone e CPF</div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="app-status-error">{error}</div> : null}
      {success ? <div className="app-status-success">{success}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <form
          className="app-panel app-rise-in h-fit space-y-4 xl:sticky xl:top-4"
          onSubmit={handleSubmit}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {editingId ? "Editar cliente" : "Novo cliente"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Nome, telefone e CPF sao obrigatorios.
              </p>
            </div>

            {editingId ? (
              <button
                type="button"
                className="app-button-ghost"
                onClick={resetForm}
              >
                Cancelar
              </button>
            ) : null}
          </div>

          <label className="block">
            <span className="app-label">Nome</span>
            <input
              className="app-input"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="app-label">Telefone</span>
            <input
              className="app-input"
              required
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="app-label">CPF</span>
            <input
              className="app-input"
              required
              value={form.cpf}
              onChange={(event) =>
                setForm((current) => ({ ...current, cpf: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="app-label">Link da imagem</span>
            <input
              className="app-input"
              value={form.photoUrl ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  photoUrl: event.target.value,
                }))
              }
              placeholder="Opcional ate o upload nativo"
            />
          </label>

          <label className="block">
            <span className="app-label">Observacoes</span>
            <textarea
              className="app-textarea"
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </label>

          <button className="app-button-primary w-full" type="submit" disabled={saving}>
            {saving
              ? "Salvando..."
              : editingId
                ? "Atualizar cliente"
                : "Criar cliente"}
          </button>
        </form>

        <div className="app-panel app-rise-in space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Lista de clientes
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Busca por nome, CPF ou telefone.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="app-input mt-0 min-w-64"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                type="button"
                className="app-button-secondary"
                onClick={() => void loadClients()}
              >
                Atualizar
              </button>
            </div>
          </div>

          <div className="app-table-shell">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contato</th>
                  <th>Veiculos</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-[var(--muted)]">
                      {loading
                        ? "Carregando clientes..."
                        : "Nenhum cliente encontrado."}
                    </td>
                  </tr>
                ) : (
                  records.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent-strong)]">
                            {client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold">{client.name}</div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              CPF: {client.cpf}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Atualizado em {formatDateTime(client.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{client.phone}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {client.photoUrl ? "Com foto vinculada" : "Sem foto"}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">
                          {client._count.vehicles} veiculo(s)
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {client._count.registrations} cadastro(s)
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="app-button-ghost"
                            onClick={() =>
                              startTransition(() => {
                                setEditingId(client.id);
                                setForm({
                                  name: client.name,
                                  phone: client.phone,
                                  cpf: client.cpf,
                                  photoUrl: client.photoUrl ?? "",
                                  notes: client.notes ?? "",
                                });
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="app-button-ghost"
                            onClick={() => void handleDelete(client.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
