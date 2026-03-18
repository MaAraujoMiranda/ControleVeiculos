"use client";

import { type FormEvent, useEffect, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Configuration, HealthResponse } from "../../lib/types";

export default function SettingsPage() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allowMultipleVehicles, setAllowMultipleVehicles] = useState(false);
  const [sessionDurationDays, setSessionDurationDays] = useState("7");

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const [nextConfiguration, nextHealth] = await Promise.all([
        api.getConfiguration(),
        api.getHealth(),
      ]);

      setConfiguration(nextConfiguration);
      setHealth(nextHealth);
      setAllowMultipleVehicles(
        nextConfiguration.allowMultipleVehiclesPerClient,
      );
      setSessionDurationDays(String(nextConfiguration.sessionDurationDays));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.updateConfiguration({
        allowMultipleVehiclesPerClient: allowMultipleVehicles,
        sessionDurationDays: Number(sessionDurationDays),
      });

      setConfiguration(updated);
      setSuccess("Configuracoes atualizadas com sucesso.");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <div className="space-y-6 py-2">
      <section className="app-panel app-rise-in relative overflow-hidden">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[rgba(36,76,116,0.12)] blur-3xl" />
        <div className="relative grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <span className="app-badge">Regras do sistema</span>
            <h2
              className="mt-4 text-4xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Parametros da operacao com visual claro e leitura executiva.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)]">
              Aqui voce controla a regra de multiplos veiculos por cliente e a
              quantidade de dias de sessao para o login permanecer ativo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="app-panel-soft px-4 py-4 text-sm">
              <span className="text-[var(--muted)]">Sessao ativa</span>
              <div className="mt-2 text-2xl font-semibold">
                {loading
                  ? "..."
                  : `${configuration?.sessionDurationDays ?? "-"} dias`}
              </div>
            </div>
            <button
              type="button"
              className="app-button-secondary h-full"
              onClick={() => void loadSettings()}
            >
              Recarregar dados
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="app-status-error">{error}</div> : null}
      {success ? <div className="app-status-success">{success}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <form
          className="app-panel app-rise-in h-fit space-y-5 xl:sticky xl:top-4"
          onSubmit={handleSubmit}
        >
          <div>
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Regras de negocio
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ajustes prontos para impactar a API e a interface.
            </p>
          </div>

          <label className="flex items-start gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
            <input
              type="checkbox"
              checked={allowMultipleVehicles}
              onChange={(event) => setAllowMultipleVehicles(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            />
            <span className="space-y-1">
              <span className="block font-semibold">
                Permitir mais de um veiculo por cliente
              </span>
              <span className="block text-sm leading-7 text-[var(--muted)]">
                Quando desligado, a API bloqueia automaticamente um segundo
                veiculo para o mesmo cliente.
              </span>
            </span>
          </label>

          <label className="block">
            <span className="app-label">Duracao da sessao em dias</span>
            <input
              className="app-input"
              type="number"
              min={7}
              max={365}
              value={sessionDurationDays}
              onChange={(event) => setSessionDurationDays(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button className="app-button-primary" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar configuracoes"}
            </button>
            <button
              type="button"
              className="app-button-secondary"
              onClick={() => {
                if (configuration) {
                  setAllowMultipleVehicles(
                    configuration.allowMultipleVehiclesPerClient,
                  );
                  setSessionDurationDays(
                    String(configuration.sessionDurationDays),
                  );
                }
              }}
            >
              Reverter formulario
            </button>
          </div>
        </form>

        <div className="grid gap-6">
          <article className="app-panel app-rise-in">
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Estado atual
            </p>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.5rem] border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Multiplos veiculos
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {loading
                    ? "Carregando..."
                    : configuration?.allowMultipleVehiclesPerClient
                      ? "Permitido"
                      : "Bloqueado"}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Sessao atual
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {loading
                    ? "Carregando..."
                    : `${configuration?.sessionDurationDays ?? "-"} dias`}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  API
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {health?.status ?? "Carregando..."}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Banco: {health?.database.status ?? "-"}
                </p>
              </div>
            </div>
          </article>

          <article className="app-panel app-rise-in">
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Diagnostico rapido
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--border)] px-4 py-3">
                <dt className="text-[var(--muted)]">API base</dt>
                <dd className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_API_URL}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--border)] px-4 py-3">
                <dt className="text-[var(--muted)]">Ultimo ping</dt>
                <dd className="font-semibold">
                  {formatDateTime(health?.timestamp)}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>
    </div>
  );
}
