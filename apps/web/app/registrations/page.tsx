"use client";

import {
  type FormEvent,
  type MouseEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getErrorMessage } from "../../lib/api";
import { formatDateTime, formatStatusLabel } from "../../lib/format";
import type { PaginationMeta, RegistrationRecord } from "../../lib/types";

/* ── Tipos internos ──────────────────────────────────────────── */

type Mode = "create" | "edit";

interface ClientForm {
  name: string;
  phone: string;
  cpf: string;
  photoUrl: string;
  notes: string;
}

interface VehicleForm {
  plate: string;
  brandModel: string;
  color: string;
  category: string;
  photoUrl: string;
}

interface RegForm {
  cardNumber: string;
  trSl: string;
  status: "ACTIVE" | "INACTIVE";
  observations: string;
}

const emptyClient: ClientForm = {
  name: "",
  phone: "",
  cpf: "",
  photoUrl: "",
  notes: "",
};

const emptyVehicle: VehicleForm = {
  plate: "",
  brandModel: "",
  color: "",
  category: "",
  photoUrl: "",
};

const emptyReg: RegForm = {
  cardNumber: "",
  trSl: "",
  status: "ACTIVE",
  observations: "",
};

const statusOptions = ["ACTIVE", "INACTIVE"] as const;

/* ── Máscaras de input ───────────────────────────────────────── */

function maskCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function maskPlate(v: string) {
  const c = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 7);
  // Formato antigo: 3 letras + 4 dígitos → ABC-1234
  // Mercosul: 3 letras + 1 dígito + 1 letra + 2 dígitos → ABC1D23
  const isOld =
    c.length > 3 && /\d/.test(c[3]) && (c.length < 5 || /\d/.test(c[4]));
  return isOld ? c.slice(0, 3) + "-" + c.slice(3) : c;
}

/* ── Componente: upload de foto ──────────────────────────────── */

function PhotoPicker({
  label,
  photoUrl,
  onChange,
}: {
  label: string;
  photoUrl: string;
  onChange: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => onChange((ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
  }

  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      title={`Foto do ${label}`}
      className="group relative flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-strong)] transition-all hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
    >
      {photoUrl ? (
        <>
          <img
            src={photoUrl}
            alt={label}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-xs font-medium text-white">Trocar</span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 p-2 text-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--muted)]"
          >
            <path d="M13 3H7L5 7H2a1 1 0 00-1 1v9a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1h-3L13 3z" />
            <circle cx="10" cy="12" r="3" />
          </svg>
          <span className="text-[10px] font-medium leading-tight text-[var(--muted)]">
            {label}
          </span>
        </div>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) readFile(file);
        }}
      />
    </button>
  );
}

/* ── Componente: cabeçalho de seção ──────────────────────────── */

function SectionHeader({
  number,
  label,
  desc,
}: {
  number: string;
  label: string;
  desc?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{label}</p>
        {desc && <p className="text-xs text-[var(--muted)]">{desc}</p>}
      </div>
    </div>
  );
}

/* ── Componente: badge de status ─────────────────────────────── */

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

/* ── Página principal ────────────────────────────────────────── */

export default function RegistrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("create");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState<RegistrationRecord[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [menu, setMenu] = useState<{
    reg: RegistrationRecord;
    top: number;
    right: number;
  } | null>(null);

  function openMenu(e: MouseEvent<HTMLButtonElement>, reg: RegistrationRecord) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenu({ reg, top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

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

  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicle);
  const [regForm, setRegForm] = useState<RegForm>(emptyReg);
  const [editingReg, setEditingReg] = useState<RegistrationRecord | null>(null);

  async function loadRegistrations() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listRegistrations({
        q: deferredSearch,
        status: statusFilter || undefined,
        pageSize: 30,
      });
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
  }, [deferredSearch, statusFilter]);

  /* Detecta ?edit=ID vindo do dashboard */
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId) return;
    router.replace("/registrations", { scroll: false });
    void (async () => {
      try {
        const reg = await api.getRegistration(editId);
        await startEdit(reg);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, []);

  function resetForm() {
    startTransition(() => {
      setMode("create");
      setEditingReg(null);
      setClientForm(emptyClient);
      setVehicleForm(emptyVehicle);
      setRegForm(emptyReg);
      setError(null);
      setSuccess(null);
    });
  }

  async function startEdit(reg: RegistrationRecord) {
    setError(null);
    setSuccess(null);
    try {
      const [fullClient, fullVehicle] = await Promise.all([
        api.getClient(reg.clientId),
        api.getVehicle(reg.vehicleId),
      ]);
      startTransition(() => {
        setMode("edit");
        setEditingReg(reg);
        setClientForm({
          name: fullClient.name,
          phone: maskPhone(fullClient.phone),
          cpf: maskCpf(fullClient.cpf),
          photoUrl: fullClient.photoUrl ?? "",
          notes: fullClient.notes ?? "",
        });
        setVehicleForm({
          plate: maskPlate(fullVehicle.plate),
          brandModel: fullVehicle.brandModel ?? "",
          color: fullVehicle.color ?? "",
          category: fullVehicle.category ?? "",
          photoUrl: fullVehicle.photoUrl ?? "",
        });
        setRegForm({
          cardNumber: reg.cardNumber ?? "",
          trSl: reg.trSl ?? "",
          status: reg.status,
          observations: reg.observations ?? "",
        });
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  /* Criar: cliente → veículo → cadastro em sequência */
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const client = await api.createClient({
        name: clientForm.name,
        phone: clientForm.phone,
        cpf: clientForm.cpf,
        photoUrl: clientForm.photoUrl || undefined,
        notes: clientForm.notes || undefined,
      });

      const vehicle = await api.createVehicle({
        clientId: client.id,
        plate: vehicleForm.plate,
        brandModel: vehicleForm.brandModel || undefined,
        color: vehicleForm.color || undefined,
        category: vehicleForm.category || undefined,
        photoUrl: vehicleForm.photoUrl || undefined,
      });

      await api.createRegistration({
        clientId: client.id,
        vehicleId: vehicle.id,
        cardNumber: regForm.cardNumber || undefined,
        trSl: regForm.trSl || undefined,
        status: regForm.status,
        observations: regForm.observations || undefined,
      });

      setSuccess(`Cadastro de ${client.name} criado com sucesso.`);
      resetForm();
      await loadRegistrations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /* Editar: atualiza cliente + veículo + cadastro */
  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingReg) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await Promise.all([
        api.updateClient(editingReg.clientId, {
          name: clientForm.name,
          phone: clientForm.phone,
          cpf: clientForm.cpf,
          photoUrl: clientForm.photoUrl || undefined,
          notes: clientForm.notes || undefined,
        }),
        api.updateVehicle(editingReg.vehicleId, {
          plate: vehicleForm.plate,
          brandModel: vehicleForm.brandModel || undefined,
          color: vehicleForm.color || undefined,
          category: vehicleForm.category || undefined,
          photoUrl: vehicleForm.photoUrl || undefined,
        }),
      ]);

      await api.updateRegistration(editingReg.id, {
        cardNumber: regForm.cardNumber || undefined,
        trSl: regForm.trSl || undefined,
        status: regForm.status,
        observations: regForm.observations || undefined,
      });

      setSuccess("Cadastro atualizado com sucesso.");
      resetForm();
      await loadRegistrations();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover este cadastro?")) return;
    setError(null);
    setSuccess(null);
    try {
      await api.deleteRegistration(id);
      setSuccess("Cadastro removido.");
      if (editingReg?.id === id) resetForm();
      await loadRegistrations();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const isEdit = mode === "edit";

  return (
    <div className="space-y-5">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--foreground)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {isEdit
              ? `Editando: ${editingReg?.client.name}`
              : "Novo Cadastro"}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            {isEdit
              ? "Atualize os dados de acesso do cadastro."
              : "Preencha cliente, veículo e acesso em um único formulário."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <button
              type="button"
              className="app-button-primary text-sm"
              onClick={resetForm}
            >
              + Novo cadastro
            </button>
          )}
          <span className="app-badge">
            {loading ? "…" : meta?.total ?? 0} registros
          </span>
        </div>
      </div>

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
            <button
              type="button"
              onClick={() => { void startEdit(menu.reg); setMenu(null); }}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => { void toggleStatus(menu.reg); setMenu(null); }}
              className={`flex w-full items-center px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-strong)] ${
                menu.reg.status === "ACTIVE" ? "text-[var(--danger)]" : "text-[var(--success)]"
              }`}
            >
              {menu.reg.status === "ACTIVE" ? "Desativar" : "Ativar"}
            </button>
            <div className="my-1 border-t border-[var(--border)]" />
            <button
              type="button"
              onClick={() => { void handleDelete(menu.reg.id); setMenu(null); }}
              className="flex w-full items-center px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
            >
              Excluir
            </button>
          </div>
        </>
      )}

      {error && <div className="app-status-error">{error}</div>}
      {success && <div className="app-status-success">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[620px_1fr]">
        {/* ══════════════════════════════════════════════════
            FORMULÁRIO
        ══════════════════════════════════════════════════ */}
        <div className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto xl:pr-1">
          {isEdit ? (
            /* ── Modo Edição (todos os campos editáveis) ── */
            <form className="space-y-4" onSubmit={handleEdit}>
              {/* ① Cliente */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="1"
                  label="Dados do cliente"
                  desc="Nome, CPF e telefone são obrigatórios"
                />
                <div className="flex items-start gap-4">
                  <PhotoPicker
                    label="Foto do cliente"
                    photoUrl={clientForm.photoUrl}
                    onChange={(url) =>
                      setClientForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Nome completo *</span>
                      <input
                        className="app-input"
                        required
                        value={clientForm.name}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">CPF *</span>
                        <input
                          className="app-input"
                          required
                          value={clientForm.cpf}
                          onChange={(e) =>
                            setClientForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))
                          }
                          maxLength={14}
                        />
                      </label>
                      <label className="block">
                        <span className="app-label">Telefone *</span>
                        <input
                          className="app-input"
                          required
                          value={clientForm.phone}
                          onChange={(e) =>
                            setClientForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))
                          }
                          maxLength={15}
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <label className="block">
                  <span className="app-label">Observações do cliente</span>
                  <textarea
                    className="app-textarea min-h-[3.5rem]"
                    value={clientForm.notes}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, notes: e.target.value }))
                    }
                  />
                </label>
              </div>

              {/* ② Veículo */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="2"
                  label="Dados do veículo"
                  desc="Placa é obrigatória (antigo ou Mercosul)"
                />
                <div className="flex items-start gap-4">
                  <PhotoPicker
                    label="Foto do veículo"
                    photoUrl={vehicleForm.photoUrl}
                    onChange={(url) =>
                      setVehicleForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Placa *</span>
                      <input
                        className="app-input font-mono uppercase tracking-widest"
                        required
                        value={vehicleForm.plate}
                        onChange={(e) =>
                          setVehicleForm((f) => ({ ...f, plate: maskPlate(e.target.value) }))
                        }
                        maxLength={8}
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">Marca / Modelo</span>
                        <input
                          className="app-input"
                          value={vehicleForm.brandModel}
                          onChange={(e) =>
                            setVehicleForm((f) => ({ ...f, brandModel: e.target.value }))
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="app-label">Cor</span>
                        <input
                          className="app-input"
                          value={vehicleForm.color}
                          onChange={(e) =>
                            setVehicleForm((f) => ({ ...f, color: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="app-label">Categoria</span>
                      <select
                        className="app-select"
                        value={vehicleForm.category}
                        onChange={(e) =>
                          setVehicleForm((f) => ({ ...f, category: e.target.value }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {["Carro", "Moto", "Caminhonete", "Caminhão", "Van", "Ônibus", "Outros"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* ③ Acesso */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="3"
                  label="Dados de acesso"
                  desc="Cartão, TR SL e status do cadastro"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="app-label">Número do cartão</span>
                    <input
                      className="app-input"
                      value={regForm.cardNumber}
                      onChange={(e) =>
                        setRegForm((f) => ({ ...f, cardNumber: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="block">
                    <span className="app-label">TR SL</span>
                    <input
                      className="app-input"
                      value={regForm.trSl}
                      onChange={(e) =>
                        setRegForm((f) => ({ ...f, trSl: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="app-label">Status</span>
                  <select
                    className="app-select"
                    value={regForm.status}
                    onChange={(e) =>
                      setRegForm((f) => ({
                        ...f,
                        status: e.target.value as RegForm["status"],
                      }))
                    }
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {formatStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="app-label">Observações</span>
                  <textarea
                    className="app-textarea min-h-[3.5rem]"
                    value={regForm.observations}
                    onChange={(e) =>
                      setRegForm((f) => ({ ...f, observations: e.target.value }))
                    }
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="app-button-primary flex-1"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Atualizar cadastro"}
                  </button>
                  <button
                    type="button"
                    className="app-button-secondary"
                    onClick={resetForm}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ── Modo Criação ── */
            <form className="space-y-4" onSubmit={handleCreate}>
              {/* ① Cliente */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="1"
                  label="Dados do cliente"
                  desc="Nome, CPF e telefone são obrigatórios"
                />

                <div className="flex items-start gap-4">
                  <PhotoPicker
                    label="Foto do cliente"
                    photoUrl={clientForm.photoUrl}
                    onChange={(url) =>
                      setClientForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />

                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Nome completo *</span>
                      <input
                        className="app-input"
                        required
                        value={clientForm.name}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Ex: João Silva"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">CPF *</span>
                        <input
                          className="app-input"
                          required
                          value={clientForm.cpf}
                          onChange={(e) =>
                            setClientForm((f) => ({
                              ...f,
                              cpf: maskCpf(e.target.value),
                            }))
                          }
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </label>
                      <label className="block">
                        <span className="app-label">Telefone *</span>
                        <input
                          className="app-input"
                          required
                          value={clientForm.phone}
                          onChange={(e) =>
                            setClientForm((f) => ({
                              ...f,
                              phone: maskPhone(e.target.value),
                            }))
                          }
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="app-label">Observações do cliente</span>
                  <textarea
                    className="app-textarea min-h-[3.5rem]"
                    value={clientForm.notes}
                    onChange={(e) =>
                      setClientForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Informações adicionais..."
                  />
                </label>
              </div>

              {/* ② Veículo */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="2"
                  label="Dados do veículo"
                  desc="Placa é obrigatória (antigo ou Mercosul)"
                />

                <div className="flex items-start gap-4">
                  <PhotoPicker
                    label="Foto do veículo"
                    photoUrl={vehicleForm.photoUrl}
                    onChange={(url) =>
                      setVehicleForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />

                  <div className="min-w-0 flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Placa *</span>
                      <input
                        className="app-input font-mono uppercase tracking-widest"
                        required
                        value={vehicleForm.plate}
                        onChange={(e) =>
                          setVehicleForm((f) => ({
                            ...f,
                            plate: maskPlate(e.target.value),
                          }))
                        }
                        placeholder="ABC-1234 ou ABC1D23"
                        maxLength={8}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">Marca / Modelo</span>
                        <input
                          className="app-input"
                          value={vehicleForm.brandModel}
                          onChange={(e) =>
                            setVehicleForm((f) => ({
                              ...f,
                              brandModel: e.target.value,
                            }))
                          }
                          placeholder="Ex: Honda Civic"
                        />
                      </label>
                      <label className="block">
                        <span className="app-label">Cor</span>
                        <input
                          className="app-input"
                          value={vehicleForm.color}
                          onChange={(e) =>
                            setVehicleForm((f) => ({
                              ...f,
                              color: e.target.value,
                            }))
                          }
                          placeholder="Ex: Prata"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="app-label">Categoria</span>
                      <select
                        className="app-select"
                        value={vehicleForm.category}
                        onChange={(e) =>
                          setVehicleForm((f) => ({
                            ...f,
                            category: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {["Carro", "Moto", "Caminhonete", "Caminhão", "Van", "Ônibus", "Outros"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>

              {/* ③ Acesso */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="3"
                  label="Dados de acesso"
                  desc="Cartão, TR SL e status do cadastro"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="app-label">Número do cartão</span>
                    <input
                      className="app-input"
                      value={regForm.cardNumber}
                      onChange={(e) =>
                        setRegForm((f) => ({ ...f, cardNumber: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                  <label className="block">
                    <span className="app-label">TR SL</span>
                    <input
                      className="app-input"
                      value={regForm.trSl}
                      onChange={(e) =>
                        setRegForm((f) => ({ ...f, trSl: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="app-label">Status</span>
                  <select
                    className="app-select"
                    value={regForm.status}
                    onChange={(e) =>
                      setRegForm((f) => ({
                        ...f,
                        status: e.target.value as RegForm["status"],
                      }))
                    }
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {formatStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="app-label">Observações do acesso</span>
                  <textarea
                    className="app-textarea min-h-[3.5rem]"
                    value={regForm.observations}
                    onChange={(e) =>
                      setRegForm((f) => ({
                        ...f,
                        observations: e.target.value,
                      }))
                    }
                    placeholder="Informações adicionais..."
                  />
                </label>

                <button
                  type="submit"
                  className="app-button-primary w-full py-3"
                  disabled={saving}
                >
                  {saving ? "Criando cadastro..." : "Criar cadastro completo"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            LISTA DE CADASTROS
        ══════════════════════════════════════════════════ */}
        <div className="app-panel space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p
                className="text-lg font-bold text-[var(--foreground)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Cadastros
              </p>
              <p className="text-sm text-[var(--muted)]">
                Busca por nome, placa, cartão ou TR SL.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                className="app-input mt-0 min-w-44"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="app-select mt-0 min-w-36"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                  <th>Cartão / TR SL</th>
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
                      className={
                        editingReg?.id === reg.id
                          ? "!bg-[var(--accent-soft)]"
                          : ""
                      }
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent)]">
                            {reg.client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{reg.client.name}</p>
                            <p className="text-xs text-[var(--muted)]">
                              {reg.client.cpf}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <p className="font-mono font-semibold">
                          {reg.vehicle.plate}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDateTime(reg.updatedAt)}
                        </p>
                      </td>

                      <td>
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
        </div>
      </div>
    </div>
  );
}
