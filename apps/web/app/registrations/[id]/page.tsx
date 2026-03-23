"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../../../lib/api";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";
import type { ClientRecord, RegistrationRecord, VehicleRecord } from "../../../lib/types";

/* ── Badge de status ─────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "border-[var(--success)]/20 bg-[var(--success-soft)] text-[var(--success)]",
    BLOCKED: "border-[var(--danger)]/20 bg-[var(--danger-soft)] text-[var(--danger)]",
    INACTIVE: "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)]",
  };
  return (
    <span className={`app-badge ${map[status] ?? map.INACTIVE}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

/* ── Campo de informação ─────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--subtle)]">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-[var(--foreground)]">
        {value || <span className="text-[var(--muted)]">—</span>}
      </p>
    </div>
  );
}

/* ── Foto clicável ───────────────────────────────────────────── */

function Photo({
  src,
  alt,
  onZoom,
}: {
  src?: string | null;
  alt: string;
  onZoom?: (src: string) => void;
}) {
  if (!src) {
    return (
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted)] sm:h-32 sm:w-32">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 5H7L4 11H2a1 1 0 00-1 1v13a1 1 0 001 1h24a1 1 0 001-1V12a1 1 0 00-1-1h-2L21 5z" />
          <circle cx="14" cy="17" r="4" />
        </svg>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onZoom?.(src)}
      className="group relative h-28 w-28 shrink-0 sm:h-32 sm:w-32 focus:outline-none"
      aria-label={`Ampliar foto de ${alt}`}
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full rounded-xl object-cover border border-[var(--border)] transition-transform duration-200 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/30 group-hover:opacity-100">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="9" cy="9" r="6" />
          <path d="M19 19l-4-4" />
          <path d="M9 6v6M6 9h6" />
        </svg>
      </div>
    </button>
  );
}

/* ── Lightbox ────────────────────────────────────────────────── */

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Fechar"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="M3 3l10 10M13 3L3 13" />
        </svg>
      </button>
      <img
        src={src}
        alt="Foto ampliada"
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ── Cabeçalho de seção ─────────────────────────────────────── */

function SectionHead({ number, label }: { number: string; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
        {number}
      </div>
      <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
    </div>
  );
}

/* ── Página ──────────────────────────────────────────────────── */

export default function ViewRegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [reg, setReg] = useState<RegistrationRecord | null>(null);
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [vehicle, setVehicle] = useState<VehicleRecord | null>(null);
  const [vehicle2, setVehicle2] = useState<VehicleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const registration = await api.getRegistration(id);
        const promises: Promise<unknown>[] = [
          api.getClient(registration.clientId),
          api.getVehicle(registration.vehicleId),
        ];
        if (registration.vehicle2Id) {
          promises.push(api.getVehicle(registration.vehicle2Id));
        }
        const [fullClient, fullVehicle, fullVehicle2] = await Promise.all(promises) as any[];
        setReg(registration);
        setClient(fullClient);
        setVehicle(fullVehicle);
        if (fullVehicle2) setVehicle2(fullVehicle2);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
          <div className="h-7 w-7 rounded-full border-2 border-[var(--accent)] border-t-transparent" style={{ animation: "spin 0.75s linear infinite" }} />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="app-status-error">{error}</div>
        <button type="button" className="app-button-secondary" onClick={() => router.back()}>
          Voltar
        </button>
      </div>
    );
  }

  if (!reg || !client || !vehicle) return null;

  const clientInitials = client.name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const displayName = client.company ? `${client.name} — ${client.company}` : client.name;

  return (
    <>
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      <div className="space-y-6">
        {/* ── Cabeçalho ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-2 flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 2L4 7l5 5" />
              </svg>
              Voltar
            </button>
            <h1
              className="text-xl font-bold text-[var(--foreground)] sm:text-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {displayName}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              Cadastro completo · atualizado em {formatDateTime(reg.updatedAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={reg.status} />
            <Link
              href={`/registrations?edit=${reg.id}`}
              className="app-button-primary text-sm"
            >
              Editar
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* ── Cliente ── */}
          <div className="app-panel space-y-5">
            <SectionHead number="1" label="Dados do cliente" />

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex justify-center sm:justify-start">
                <Photo src={client.photoUrl} alt={client.name} onZoom={setLightboxSrc} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <InfoRow label="Nome completo" value={client.name} />
                {client.company && <InfoRow label="Empresa" value={client.company} />}
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="CPF" value={client.cpf} />
                  <InfoRow label="Telefone" value={client.phone} />
                </div>
              </div>
            </div>

            {client.notes && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--subtle)]">Observações</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{client.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-strong)] px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent)]">
                {clientInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--muted)]">Cadastrado em</p>
                <p className="text-sm font-medium text-[var(--foreground)]">{formatDateTime(client.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* ── Veículo 1 ── */}
          <div className="app-panel space-y-5">
            <SectionHead number="2" label={vehicle2 ? "Veículo 1" : "Dados do veículo"} />

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex justify-center sm:justify-start">
                <Photo src={vehicle.photoUrl} alt={vehicle.plate} onZoom={setLightboxSrc} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <InfoRow label="Placa" value={vehicle.plate} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Marca / Modelo" value={vehicle.brandModel} />
                  <InfoRow label="Cor" value={vehicle.color} />
                </div>
                <InfoRow label="Categoria" value={vehicle.category} />
              </div>
            </div>
          </div>

          {/* ── Veículo 2 (se existir) ── */}
          {vehicle2 && (
            <div className="app-panel space-y-5">
              <SectionHead number="2b" label="Veículo 2" />

              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex justify-center sm:justify-start">
                  <Photo src={vehicle2.photoUrl} alt={vehicle2.plate} onZoom={setLightboxSrc} />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <InfoRow label="Placa" value={vehicle2.plate} />
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Marca / Modelo" value={vehicle2.brandModel} />
                    <InfoRow label="Cor" value={vehicle2.color} />
                  </div>
                  <InfoRow label="Categoria" value={vehicle2.category} />
                </div>
              </div>
            </div>
          )}

          {/* ── Acesso ── */}
          <div className={`app-panel space-y-5 ${vehicle2 ? "" : "lg:col-span-2"}`}>
            <SectionHead number="3" label="Dados de acesso" />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <InfoRow label="Número do cartão" value={reg.cardNumber} />
              <InfoRow label="TR SL" value={reg.trSl} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--subtle)]">Status</p>
                <div className="mt-1">
                  <StatusBadge status={reg.status} />
                </div>
              </div>
              <InfoRow label="Cadastrado em" value={formatDateTime(reg.createdAt)} />
            </div>

            {reg.observations && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--subtle)]">Observações</p>
                <p className="mt-1 text-sm text-[var(--foreground)]">{reg.observations}</p>
              </div>
            )}
          </div>

          {/* ── Declaração assinada ── */}
          {reg.declarationUrl && (
            <div className="app-panel space-y-5 lg:col-span-2">
              <SectionHead number="4" label="Declaração assinada" />
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <Photo
                  src={reg.declarationUrl}
                  alt="Declaração assinada"
                  onZoom={setLightboxSrc}
                />
                <div className="min-w-0">
                  <p className="text-sm text-[var(--muted)]">
                    Clique na imagem para ampliar e visualizar a declaração assinada pelo cliente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
