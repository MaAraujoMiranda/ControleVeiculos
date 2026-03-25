"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { formatDateTime } from "../../lib/format";
import { isLicenseBlocked } from "../../lib/license";
import type { LicensePayment, LicenseRecord } from "../../lib/types";

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    TRIAL: { label: "Período de teste", cls: "border-[var(--info)]/20 bg-[var(--info-soft,#eff6ff)] text-[var(--info,#2563eb)]" },
    ACTIVE: { label: "Ativa", cls: "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]" },
    EXPIRED: { label: "Vencida", cls: "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]" },
    SUSPENDED: { label: "Suspensa", cls: "border-[var(--warning)]/20 bg-[var(--warning-soft,#fffbeb)] text-[var(--warning,#d97706)]" },
  };
  const { label, cls } = map[status] ?? map.TRIAL;
  return <span className={`app-badge ${cls}`}>{label}</span>;
}

function dispatchLicenseUpdated(license: LicenseRecord | null) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("license:updated", { detail: license }));
}

export default function SubscriptionPage() {
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* Formulário de pagamento */
  const [holderName, setHolderName] = useState("");
  const [holderCpf, setHolderCpf] = useState("");
  const [holderEmail, setHolderEmail] = useState("");
  const [method, setMethod] = useState<"PIX" | "BOLETO">("PIX");
  const [paying, setPaying] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<LicensePayment | null>(null);
  const [syncing, setSyncing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const licenseExpired = license ? isLicenseBlocked(license) : false;

  async function loadLicense() {
    try {
      const lic = await api.getLicense();
      setLicense(lic);
      const pending = lic.payments.find((p) => p.status === "PENDING");
      setPendingPayment(pending ?? null);
      dispatchLicenseUpdated(lic);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLicense();
  }, []);

  /* Polling automático para PIX pendente */
  useEffect(() => {
    if (pendingPayment?.status === "PENDING" && pendingPayment.method === "PIX") {
      pollRef.current = setInterval(() => {
        void syncPayment(pendingPayment.id, true);
      }, 6000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pendingPayment?.id]);

  async function syncPayment(paymentId: string, silent = false) {
    if (!silent) setSyncing(true);
    try {
      const updated = await api.syncLicensePayment(paymentId);
      setLicense(updated);
      const still = updated.payments.find((p) => p.status === "PENDING");
      setPendingPayment(still ?? null);
      if (!still && !silent) setSuccess("Pagamento confirmado! Licença ativada.");
      if (!still && pollRef.current) clearInterval(pollRef.current);
      dispatchLicenseUpdated(updated);
    } catch {
      /* silencia erros de polling */
    } finally {
      if (!silent) setSyncing(false);
    }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPaying(true);
    try {
      const payment = await api.createLicensePayment({
        holderName,
        holderCpf,
        holderEmail,
        method,
      });
      setPendingPayment(payment);
      await loadLicense();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent" style={{ animation: "spin 0.75s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2">
      {/* Cabeçalho */}
      <section className="app-panel app-rise-in relative overflow-hidden">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[rgba(36,76,116,0.12)] blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="app-badge">Licença do sistema</span>
            <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Minha Licença
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Gerencie sua assinatura e pagamentos via PIX ou Boleto.
            </p>
          </div>
          {license && <StatusChip status={license.status} />}
        </div>
      </section>

      {error && <div className="app-status-error">{error}</div>}
      {success && <div className="app-status-success">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        {/* Status + pagamento pendente */}
        <div className="space-y-6">
          {/* Card de status */}
          {license && (
            <div className="app-panel space-y-4">
              <p className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                Situação atual
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] px-4 py-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                    {licenseExpired ? "Venceu em" : "Válida até"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{formatDateTime(license.expiresAt)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] px-4 py-4 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">Valor</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">
                    R$ {license.price.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PIX pendente */}
          {pendingPayment && pendingPayment.method === "PIX" && pendingPayment.pixQrCode && (
            <div className="app-panel space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[var(--foreground)]">QR Code PIX</p>
                <span className="flex h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
              </div>
              <p className="text-sm text-[var(--muted)]">Aguardando confirmação do pagamento...</p>

              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pendingPayment.pixQrCode}`}
                  alt="QR Code PIX"
                  className="h-52 w-52 rounded-xl border border-[var(--border)]"
                />
              </div>

              {pendingPayment.pixCopyPaste && (
                <div>
                  <p className="mb-1 text-xs text-[var(--muted)]">PIX Copia e Cola</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={pendingPayment.pixCopyPaste}
                      className="app-input font-mono text-xs"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      type="button"
                      className="app-button-secondary shrink-0"
                      onClick={() => void navigator.clipboard.writeText(pendingPayment.pixCopyPaste!)}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="app-button-secondary w-full"
                onClick={() => void syncPayment(pendingPayment.id)}
                disabled={syncing}
              >
                {syncing ? "Verificando..." : "Verificar pagamento"}
              </button>
            </div>
          )}

          {/* Boleto pendente */}
          {pendingPayment && pendingPayment.method === "BOLETO" && pendingPayment.boletoUrl && (
            <div className="app-panel space-y-4">
              <p className="font-semibold text-[var(--foreground)]">Boleto bancário</p>
              <p className="text-sm text-[var(--muted)]">O boleto pode levar até 2 dias úteis para compensar.</p>
              <a
                href={pendingPayment.boletoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="app-button-primary block w-full text-center"
              >
                Abrir boleto
              </a>
              <button
                type="button"
                className="app-button-secondary w-full"
                onClick={() => void syncPayment(pendingPayment.id)}
                disabled={syncing}
              >
                {syncing ? "Verificando..." : "Verificar pagamento"}
              </button>
            </div>
          )}

        </div>

        {/* Formulário de renovação */}
        {!pendingPayment && (
          <form className="app-panel h-fit space-y-5" onSubmit={handlePay}>
            <div>
              <p className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                Renovar licença
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Renove sua licença por R$ {(license?.price ?? 350).toFixed(2).replace(".", ",")}.
              </p>
            </div>

            <label className="block">
              <span className="app-label">Nome completo *</span>
              <input
                className="app-input"
                required
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                placeholder="Nome para a cobrança"
              />
            </label>

            <label className="block">
              <span className="app-label">CPF *</span>
              <input
                className="app-input"
                required
                value={holderCpf}
                onChange={(e) => setHolderCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </label>

            <label className="block">
              <span className="app-label">E-mail *</span>
              <input
                className="app-input"
                required
                type="email"
                value={holderEmail}
                onChange={(e) => setHolderEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </label>

            <div>
              <span className="app-label">Forma de pagamento</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["PIX", "BOLETO"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                      method === m
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/50"
                    }`}
                  >
                    {m === "PIX" ? "PIX" : "Boleto"}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="app-button-primary w-full py-3" disabled={paying}>
              {paying ? "Gerando cobrança..." : `Gerar ${method === "PIX" ? "QR Code PIX" : "Boleto"}`}
            </button>

            <p className="text-center text-xs text-[var(--muted)]">
              Pagamentos processados com segurança via Asaas.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
