"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "../../components/auth-provider";
import { api, getErrorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import type { Configuration, HealthResponse, LicenseRecord } from "../../lib/types";

export default function SettingsPage() {
  const { session } = useAuth();
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLicense, setSavingLicense] = useState(false);
  const [suspendingLicense, setSuspendingLicense] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allowMultipleVehicles, setAllowMultipleVehicles] = useState(false);
  const [sessionDurationDays, setSessionDurationDays] = useState("7");
  const [maintenanceGraceDays, setMaintenanceGraceDays] = useState("10");
  const [maintenanceHour, setMaintenanceHour] = useState("23");
  const [maintenanceTimeZone, setMaintenanceTimeZone] = useState("America/Sao_Paulo");
  const [manualSuspensionReason, setManualSuspensionReason] = useState("");
  const isAdmin = session?.user.role === "ADMIN";
  const apiOnline = health?.status?.toLowerCase() === "ok";
  const databaseOnline = health?.database.status === "connected";

  function hydrateLicense(nextLicense: LicenseRecord | null) {
    setLicense(nextLicense);

    if (!nextLicense) return;

    setMaintenanceGraceDays(String(nextLicense.maintenanceGraceDays));
    setMaintenanceHour(String(nextLicense.maintenanceHour));
    setMaintenanceTimeZone(nextLicense.maintenanceTimeZone);
    setManualSuspensionReason(nextLicense.manualSuspensionReason ?? "");
  }

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const [nextConfiguration, nextHealth, nextLicense] = await Promise.all([
        api.getConfiguration(),
        api.getHealth(),
        isAdmin ? api.getLicenseAdmin() : Promise.resolve(null),
      ]);

      setConfiguration(nextConfiguration);
      setHealth(nextHealth);
      hydrateLicense(nextLicense);
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

  async function handleLicenseSettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLicense(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.updateLicenseAdminSettings({
        maintenanceGraceDays: Number(maintenanceGraceDays),
        maintenanceHour: Number(maintenanceHour),
        maintenanceTimeZone,
      });

      hydrateLicense(updated);
      setSuccess("Configuracoes da licenca atualizadas.");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSavingLicense(false);
    }
  }

  async function handleSuspendLicense() {
    setSuspendingLicense(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.suspendLicense({
        reason: manualSuspensionReason,
      });
      hydrateLicense(updated);
      setSuccess("Licenca suspensa. O cliente vera a tela de manutencao.");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSuspendingLicense(false);
    }
  }

  async function handleUnsuspendLicense() {
    setSuspendingLicense(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.unsuspendLicense();
      hydrateLicense(updated);
      setSuccess("Suspensao manual removida. O status foi recalculado.");
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSuspendingLicense(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [isAdmin]);

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
                  {loading
                    ? "Carregando..."
                    : apiOnline
                      ? "Online"
                      : "Indisponivel"}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  Banco
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {loading
                    ? "Carregando..."
                    : databaseOnline
                      ? "Conectado"
                      : "Desconectado"}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {loading ? "-" : health?.database.status ?? "-"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {isAdmin && (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1fr]">
          <article className="app-panel app-rise-in space-y-5">
            <div>
              <span className="app-badge">Administracao da licenca</span>
              <p
                className="mt-3 text-2xl font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Controle de bloqueio do cliente
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Alteracoes aqui sao aplicadas na proxima consulta da licenca.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {license?.status ?? "Carregando..."}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Suspensao manual
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {license?.manuallySuspendedAt ? "Ativa" : "Inativa"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Vencimento
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {license ? formatDateTime(license.expiresAt) : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Fora do ar em
                </p>
                <p className="mt-2 text-sm font-semibold">
                  {license ? formatDateTime(license.maintenanceAt) : "-"}
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-6">
            <form
              className="app-panel app-rise-in space-y-5"
              onSubmit={handleLicenseSettingsSubmit}
            >
              <div>
                <p
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Prazo de manutencao
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Define quando a licenca vencida deixa de mostrar pagamento e
                  passa para fora do ar.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="app-label">Dias de tolerancia</span>
                  <input
                    className="app-input"
                    type="number"
                    min={0}
                    max={365}
                    value={maintenanceGraceDays}
                    onChange={(event) =>
                      setMaintenanceGraceDays(event.target.value)
                    }
                  />
                </label>

                <label className="block">
                  <span className="app-label">Hora de corte</span>
                  <input
                    className="app-input"
                    type="number"
                    min={0}
                    max={23}
                    value={maintenanceHour}
                    onChange={(event) => setMaintenanceHour(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="app-label">Fuso horario</span>
                  <input
                    className="app-input"
                    value={maintenanceTimeZone}
                    onChange={(event) =>
                      setMaintenanceTimeZone(event.target.value)
                    }
                  />
                </label>
              </div>

              <button
                className="app-button-primary"
                type="submit"
                disabled={savingLicense}
              >
                {savingLicense ? "Salvando..." : "Salvar regra da licenca"}
              </button>
            </form>

            <div className="app-panel app-rise-in space-y-5">
              <div>
                <p
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Bloqueio manual
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Suspender leva o cliente para manutencao imediatamente.
                  Desbloquear remove apenas a suspensao manual e recalcula o
                  status pela regra acima.
                </p>
              </div>

              <label className="block">
                <span className="app-label">Motivo interno</span>
                <input
                  className="app-input"
                  maxLength={255}
                  value={manualSuspensionReason}
                  onChange={(event) =>
                    setManualSuspensionReason(event.target.value)
                  }
                  placeholder="Ex.: pagamento em atraso, analise financeira"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="app-button-secondary border border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  disabled={suspendingLicense}
                  onClick={() => void handleSuspendLicense()}
                >
                  {suspendingLicense ? "Aplicando..." : "Suspender agora"}
                </button>
                <button
                  type="button"
                  className="app-button-secondary"
                  disabled={suspendingLicense}
                  onClick={() => void handleUnsuspendLicense()}
                >
                  {suspendingLicense ? "Aplicando..." : "Desbloquear"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
