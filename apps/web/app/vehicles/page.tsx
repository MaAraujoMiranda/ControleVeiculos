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
import type {
  ClientOption,
  PaginationMeta,
  VehiclePayload,
  VehicleRecord,
} from "../../lib/types";

const emptyForm: VehiclePayload = {
  clientId: "",
  plate: "",
  brandModel: "",
  color: "",
  photoUrl: "",
};

export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [records, setRecords] = useState<VehicleRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [form, setForm] = useState<VehiclePayload>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadVehicles() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.listVehicles({
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

  async function loadClients() {
    try {
      const response = await api.listClients({ pageSize: 100 });
      setClients(
        response.data.map((client) => ({
          id: client.id,
          name: client.name,
          clientType: client.clientType,
          clientModality: client.clientModality,
          cpf: client.cpf,
          phone: client.phone,
          company: client.company,
        })),
      );
    } catch (nextError) {
      setError(getErrorMessage(nextError));
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
        clientId: form.clientId,
        plate: form.plate,
        brandModel: form.brandModel?.trim() || undefined,
        color: form.color?.trim() || undefined,
        photoUrl: form.photoUrl?.trim() || undefined,
      };

      if (editingId) {
        await api.updateVehicle(editingId, payload);
        setSuccess("Veiculo atualizado com sucesso.");
      } else {
        await api.createVehicle(payload);
        setSuccess("Veiculo criado com sucesso.");
      }

      resetForm();
      await loadVehicles();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Deseja remover este veiculo? Os cadastros vinculados tambem serao desativados.",
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await api.deleteVehicle(id);
      setSuccess("Veiculo removido com sucesso.");
      if (editingId === id) {
        resetForm();
      }
      await loadVehicles();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  useEffect(() => {
    async function syncVehicles() {
      setLoading(true);
      setError(null);

      try {
        const [clientsResponse, vehiclesResponse] = await Promise.all([
          api.listClients({ pageSize: 100 }),
          api.listVehicles({
            q: deferredSearch,
            pageSize: 20,
          }),
        ]);

        setClients(
          clientsResponse.data.map((client) => ({
            id: client.id,
            name: client.name,
            clientType: client.clientType,
            clientModality: client.clientModality,
            cpf: client.cpf,
            phone: client.phone,
            company: client.company,
          })),
        );
        setRecords(vehiclesResponse.data);
        setMeta(vehiclesResponse.meta);
      } catch (nextError) {
        setError(getErrorMessage(nextError));
      } finally {
        setLoading(false);
      }
    }

    void syncVehicles();
  }, [deferredSearch]);

  return (
    <div className="space-y-6 py-2">
      <section className="app-panel app-rise-in relative overflow-hidden">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[rgba(36,76,116,0.12)] blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <span className="app-badge">Cadastro de veiculos</span>
            <h2
              className="mt-4 text-4xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Placas, modelos e vinculos com cara de sistema profissional.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
              A regra de um ou mais veiculos por cliente e respeitada pela API e
              refletida automaticamente nesta tela.
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
              <span className="text-[var(--muted)]">Padrao de placa</span>
              <div className="mt-2 font-semibold">Antiga e Mercosul</div>
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
                {editingId ? "Editar veiculo" : "Novo veiculo"}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Placa aceita modelo antigo e Mercosul.
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
            <span className="app-label">Cliente</span>
            <select
              className="app-select"
              required
              value={form.clientId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  clientId: event.target.value,
                }))
              }
            >
              <option value="">Selecione um cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="app-label">Placa</span>
            <input
              className="app-input"
              required
              value={form.plate}
              onChange={(event) =>
                setForm((current) => ({ ...current, plate: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="app-label">Marca / modelo</span>
            <input
              className="app-input"
              value={form.brandModel ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  brandModel: event.target.value,
                }))
              }
            />
          </label>

          <label className="block">
            <span className="app-label">Cor</span>
            <input
              className="app-input"
              value={form.color ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, color: event.target.value }))
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
            />
          </label>

          <button className="app-button-primary w-full" type="submit" disabled={saving}>
            {saving
              ? "Salvando..."
              : editingId
                ? "Atualizar veiculo"
                : "Criar veiculo"}
          </button>
        </form>

        <div className="app-panel app-rise-in space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className="text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Lista de veiculos
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Busca por placa, cliente ou modelo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="app-input mt-0 min-w-64"
                placeholder="Buscar veiculo..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                type="button"
                className="app-button-secondary"
                onClick={() => void Promise.all([loadClients(), loadVehicles()])}
              >
                Atualizar
              </button>
            </div>
          </div>

          <div className="app-table-shell">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Cliente</th>
                  <th>Detalhes</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-[var(--muted)]">
                      {loading
                        ? "Carregando veiculos..."
                        : "Nenhum veiculo encontrado."}
                    </td>
                  </tr>
                ) : (
                  records.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td>
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(36,76,116,0.12)] text-xs font-semibold text-[var(--info)]">
                            CAR
                          </div>
                          <div>
                            <div className="font-mono text-base font-semibold">
                              {vehicle.plate}
                            </div>
                            <div className="mt-1 text-xs text-[var(--muted)]">
                              Atualizado em {formatDateTime(vehicle.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold">{vehicle.client.name}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {vehicle.client.cpf}
                        </div>
                      </td>
                      <td>
                        <div>{vehicle.brandModel || "Modelo nao informado"}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          Cor: {vehicle.color || "Nao informada"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {vehicle._count?.registrations ?? 0} cadastro(s)
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="app-button-ghost"
                            onClick={() =>
                              startTransition(() => {
                                setEditingId(vehicle.id);
                                setForm({
                                  clientId: vehicle.clientId,
                                  plate: vehicle.plate,
                                  brandModel: vehicle.brandModel ?? "",
                                  color: vehicle.color ?? "",
                                  photoUrl: vehicle.photoUrl ?? "",
                                });
                              })
                            }
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="app-button-ghost"
                            onClick={() => void handleDelete(vehicle.id)}
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
