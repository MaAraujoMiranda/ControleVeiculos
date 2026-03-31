"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, getErrorMessage } from "../../lib/api";
import { formatStatusLabel } from "../../lib/format";
import type { RegistrationRecord } from "../../lib/types";

/* ── Tipos internos ──────────────────────────────────────────── */

type Mode = "create" | "edit";

interface ClientForm {
  name: string;
  company: string;
  clientType: string;
  clientModality: string;
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
  company: "",
  clientType: "",
  clientModality: "",
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
const clientTypeOptions = [
  "Proprietario",
  "Socio",
  "Funcionario",
] as const;
const clientModalityOptions = ["Mensalista", "Sala"] as const;
const IMAGE_INLINE_SOFT_LIMIT_BYTES = 220 * 1024;
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_OUTPUT_QUALITY = 0.82;

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

function normalizePlate(v: string) {
  return v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function normalizeDigits(v: string) {
  return v.replace(/\D/g, "");
}

function isValidPlate(v: string) {
  const plate = normalizePlate(v);
  return /^[A-Z]{3}\d{4}$/.test(plate) || /^[A-Z]{3}\d[A-Z]\d{2}$/.test(plate);
}

function isValidCpf(v: string) {
  const digits = normalizeDigits(v);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateVerifier = (base: string, factor: number) => {
    let total = 0;

    for (const character of base) {
      total += Number(character) * factor;
      factor -= 1;
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateVerifier(digits.slice(0, 9), 10);
  const secondDigit = calculateVerifier(digits.slice(0, 10), 11);

  return digits[9] === String(firstDigit) && digits[10] === String(secondDigit);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => resolve((event.target?.result as string) ?? "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Falha ao ler a imagem."));

    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao abrir a imagem."));
    image.src = dataUrl;
  });
}

async function optimizeImageForUpload(file: File) {
  const originalDataUrl = await readFileAsDataUrl(file);

  if (!file.type.startsWith("image/") || file.size <= IMAGE_INLINE_SOFT_LIMIT_BYTES) {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const largestSide = Math.max(image.width, image.height);
  const scale =
    largestSide > IMAGE_MAX_DIMENSION ? IMAGE_MAX_DIMENSION / largestSide : 1;
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    return originalDataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", IMAGE_OUTPUT_QUALITY);
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

  async function readFile(file: File) {
    try {
      onChange(await optimizeImageForUpload(file));
    } catch {
      onChange(await readFileAsDataUrl(file));
    }
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
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await readFile(file);
          }
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

/* ── Componente: campos de veículo reutilizável ──────────────── */

function VehicleFormFields({
  form,
  setForm,
  plateInvalid = false,
}: {
  form: VehicleForm;
  setForm: React.Dispatch<React.SetStateAction<VehicleForm>>;
  plateInvalid?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <PhotoPicker
        label="Foto do veículo"
        photoUrl={form.photoUrl}
        onChange={(url) => setForm((f) => ({ ...f, photoUrl: url }))}
      />
      <div className="min-w-0 w-full flex-1 space-y-3">
        <label className="block">
          <span className="app-label">Placa</span>
          <input
            className={`app-input font-mono uppercase tracking-widest ${
              plateInvalid ? "border-[var(--danger)] focus:border-[var(--danger)] bg-[var(--danger-soft)]/30" : ""
            }`}
            value={form.plate}
            onChange={(e) => setForm((f) => ({ ...f, plate: maskPlate(e.target.value) }))}
            placeholder="ABC-1234 ou ABC1D23"
            maxLength={8}
          />
          {plateInvalid && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              Placa inválida. Use o padrão antigo (ABC-1234) ou Mercosul (ABC1D23).
            </p>
          )}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="app-label">Marca / Modelo</span>
            <input
              className="app-input"
              value={form.brandModel}
              onChange={(e) => setForm((f) => ({ ...f, brandModel: e.target.value }))}
              placeholder="Ex: Honda Civic"
            />
          </label>
          <label className="block">
            <span className="app-label">Cor</span>
            <input
              className="app-input"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              placeholder="Ex: Prata"
            />
          </label>
        </div>
        <label className="block">
          <span className="app-label">Categoria</span>
          <select
            className="app-select"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            <option value="">Selecione...</option>
            {["Carro", "Moto", "Caminhonete", "Caminhão", "Van", "Ônibus", "Outros"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/* ── Página principal ────────────────────────────────────────── */

export default function RegistrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("create");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [clientForm, setClientForm] = useState<ClientForm>(emptyClient);
  const [vehicleForm, setVehicleForm] = useState<VehicleForm>(emptyVehicle);
  const [vehicle2Form, setVehicle2Form] = useState<VehicleForm>(emptyVehicle);
  const [hasVehicle2, setHasVehicle2] = useState(false);
  const [declarationUrl, setDeclarationUrl] = useState("");
  const [regForm, setRegForm] = useState<RegForm>(emptyReg);
  const [editingReg, setEditingReg] = useState<RegistrationRecord | null>(null);
  const [allowMultipleVehicles, setAllowMultipleVehicles] = useState(false);
  const cpfInvalid = clientForm.cpf.trim().length > 0 && !isValidCpf(clientForm.cpf);
  const primaryPlateInvalid =
    vehicleForm.plate.trim().length > 0 && !isValidPlate(vehicleForm.plate);
  const secondaryPlateInvalid =
    hasVehicle2 &&
    vehicle2Form.plate.trim().length > 0 &&
    !isValidPlate(vehicle2Form.plate);

  useEffect(() => {
    api.getConfiguration()
      .then((c) => setAllowMultipleVehicles(c.allowMultipleVehiclesPerClient))
      .catch(() => {});
  }, []);

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
      setVehicle2Form(emptyVehicle);
      setHasVehicle2(false);
      setDeclarationUrl("");
      setRegForm(emptyReg);
      setError(null);
      setSuccess(null);
    });
  }

  async function startEdit(reg: RegistrationRecord) {
    setError(null);
    setSuccess(null);
    try {
      const promises: Promise<unknown>[] = [
        api.getClient(reg.clientId),
        api.getVehicle(reg.vehicleId),
      ];
      if (reg.vehicle2Id) promises.push(api.getVehicle(reg.vehicle2Id));
      const [fullClient, fullVehicle, fullVehicle2] = await Promise.all(promises) as any[];
      startTransition(() => {
        setMode("edit");
        setEditingReg(reg);
        setClientForm({
          name: fullClient.name,
          company: fullClient.company ?? "",
          clientType: fullClient.clientType ?? "",
          clientModality: fullClient.clientModality ?? "",
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
        if (fullVehicle2) {
          setHasVehicle2(true);
          setVehicle2Form({
            plate: maskPlate(fullVehicle2.plate),
            brandModel: fullVehicle2.brandModel ?? "",
            color: fullVehicle2.color ?? "",
            category: fullVehicle2.category ?? "",
            photoUrl: fullVehicle2.photoUrl ?? "",
          });
        } else {
          setHasVehicle2(false);
          setVehicle2Form(emptyVehicle);
        }
        setDeclarationUrl(reg.declarationUrl ?? "");
        setRegForm({
          cardNumber: reg.cardNumber ?? "",
          trSl: reg.trSl ?? "",
          status: (reg.status === "BLOCKED" ? "ACTIVE" : reg.status) as RegForm["status"],
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

    if (cpfInvalid) {
      setError("CPF inválido. Corrija o CPF para continuar.");
      setSaving(false);
      return;
    }

    if (primaryPlateInvalid) {
      setError("Placa do veiculo principal invalida. Use o padrao antigo ou Mercosul.");
      setSaving(false);
      return;
    }

    if (secondaryPlateInvalid) {
      setError("Placa do segundo veiculo invalida. Use o padrao antigo ou Mercosul.");
      setSaving(false);
      return;
    }

    try {
      const client = await api.createClient({
        name: clientForm.name || undefined,
        company: clientForm.company || undefined,
        clientType: clientForm.clientType || undefined,
        clientModality: clientForm.clientModality || undefined,
        phone: clientForm.phone || undefined,
        cpf: clientForm.cpf || undefined,
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

      let vehicle2Id: string | undefined;
      if (hasVehicle2 && vehicle2Form.plate) {
        const v2 = await api.createVehicle({
          clientId: client.id,
          plate: vehicle2Form.plate,
          brandModel: vehicle2Form.brandModel || undefined,
          color: vehicle2Form.color || undefined,
          category: vehicle2Form.category || undefined,
          photoUrl: vehicle2Form.photoUrl || undefined,
        });
        vehicle2Id = v2.id;
      }

      await api.createRegistration({
        clientId: client.id,
        vehicleId: vehicle.id,
        vehicle2Id: vehicle2Id ?? null,
        cardNumber: regForm.cardNumber || undefined,
        trSl: regForm.trSl || undefined,
        status: regForm.status,
        observations: regForm.observations || undefined,
        declarationUrl: declarationUrl || null,
      });

      setSuccess(
        client.name
          ? `Cadastro de ${client.name} criado com sucesso.`
          : "Cadastro criado com sucesso.",
      );
      resetForm();
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

    if (cpfInvalid) {
      setError("CPF inválido. Corrija o CPF para continuar.");
      setSaving(false);
      return;
    }

    if (primaryPlateInvalid) {
      setError("Placa do veiculo principal invalida. Use o padrao antigo ou Mercosul.");
      setSaving(false);
      return;
    }

    if (secondaryPlateInvalid) {
      setError("Placa do segundo veiculo invalida. Use o padrao antigo ou Mercosul.");
      setSaving(false);
      return;
    }

    try {
      const updatePromises: Promise<unknown>[] = [
        api.updateClient(editingReg.clientId, {
          name: clientForm.name || undefined,
          company: clientForm.company || undefined,
          clientType: clientForm.clientType || undefined,
          clientModality: clientForm.clientModality || undefined,
          phone: clientForm.phone || undefined,
          cpf: clientForm.cpf || undefined,
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
      ];

      let vehicle2Id: string | null = editingReg.vehicle2Id;
      if (hasVehicle2 && vehicle2Form.plate) {
        if (editingReg.vehicle2Id) {
          await api.updateVehicle(editingReg.vehicle2Id, {
            plate: vehicle2Form.plate,
            brandModel: vehicle2Form.brandModel || undefined,
            color: vehicle2Form.color || undefined,
            category: vehicle2Form.category || undefined,
            photoUrl: vehicle2Form.photoUrl || undefined,
          });
        } else {
          const v2 = await api.createVehicle({
            clientId: editingReg.clientId,
            plate: vehicle2Form.plate,
            brandModel: vehicle2Form.brandModel || undefined,
            color: vehicle2Form.color || undefined,
            category: vehicle2Form.category || undefined,
            photoUrl: vehicle2Form.photoUrl || undefined,
          });
          vehicle2Id = v2.id;
        }
      } else if (!hasVehicle2) {
        vehicle2Id = null;
      }

      await Promise.all(updatePromises);

      await api.updateRegistration(editingReg.id, {
        vehicle2Id,
        cardNumber: regForm.cardNumber || undefined,
        trSl: regForm.trSl || undefined,
        status: regForm.status,
        observations: regForm.observations || undefined,
        declarationUrl: declarationUrl || null,
      });

      setSuccess("Cadastro atualizado com sucesso.");
      resetForm();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  const isEdit = mode === "edit";

  return (
    <div className="space-y-5">
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
        </div>
      </div>

      {error && <div className="app-status-error">{error}</div>}
      {success && <div className="app-status-success">{success}</div>}

      <div className="mx-auto max-w-4xl">
        {/* ══════════════════════════════════════════════════
            FORMULÁRIO
        ══════════════════════════════════════════════════ */}
        <div className="min-w-0">
          {isEdit ? (
            /* ── Modo Edição (todos os campos editáveis) ── */
            <form className="space-y-4" onSubmit={handleEdit}>
              {/* ① Cliente */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="1"
                  label="Dados do cliente"
                  desc="Todos os campos são opcionais"
                />
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <PhotoPicker
                    label="Foto do cliente"
                    photoUrl={clientForm.photoUrl}
                    onChange={(url) =>
                      setClientForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />
                  <div className="min-w-0 w-full flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Nome completo</span>
                      <input
                        className="app-input"
                        value={clientForm.name}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="app-label">Empresa / Organização</span>
                      <input
                        className="app-input"
                        value={clientForm.company}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, company: e.target.value }))
                        }
                        placeholder="Ex: AMR Construtora"
                      />
                    </label>
                    <label className="block">
                      <span className="app-label">Tipo de cliente</span>
                      <select
                        className="app-select"
                        value={clientForm.clientType}
                        onChange={(e) =>
                          setClientForm((f) => ({
                            ...f,
                            clientType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {clientTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="app-label">Tipo de modalidade</span>
                      <select
                        className="app-select"
                        value={clientForm.clientModality}
                        onChange={(e) =>
                          setClientForm((f) => ({
                            ...f,
                            clientModality: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {clientModalityOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">CPF</span>
                        <input
                          className={`app-input ${cpfInvalid ? "border-[var(--danger)] focus:border-[var(--danger)] bg-[var(--danger-soft)]/30" : ""}`}
                          value={clientForm.cpf}
                          onChange={(e) =>
                            setClientForm((f) => ({ ...f, cpf: maskCpf(e.target.value) }))
                          }
                          maxLength={14}
                        />
                        {cpfInvalid && (
                          <p className="mt-1 text-xs text-[var(--danger)]">
                            CPF inválido. Informe um CPF válido.
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="app-label">Telefone</span>
                        <input
                          className="app-input"
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
                  desc="Campos opcionais (aceita placa antiga ou Mercosul)"
                />
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <PhotoPicker
                    label="Foto do veículo"
                    photoUrl={vehicleForm.photoUrl}
                    onChange={(url) =>
                      setVehicleForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />
                  <div className="min-w-0 w-full flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Placa</span>
                      <input
                        className={`app-input font-mono uppercase tracking-widest ${
                          primaryPlateInvalid ? "border-[var(--danger)] focus:border-[var(--danger)] bg-[var(--danger-soft)]/30" : ""
                        }`}
                        value={vehicleForm.plate}
                        onChange={(e) =>
                          setVehicleForm((f) => ({ ...f, plate: maskPlate(e.target.value) }))
                        }
                        maxLength={8}
                      />
                      {primaryPlateInvalid && (
                        <p className="mt-1 text-xs text-[var(--danger)]">
                          Placa inválida. Use o padrão antigo (ABC-1234) ou Mercosul (ABC1D23).
                        </p>
                      )}
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

              {/* ② b — 2º Veículo (se múltiplos permitidos) */}
              {allowMultipleVehicles && (
                <div className="app-panel space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader
                      number="2b"
                      label="Segundo veículo"
                      desc="Opcional — mesmo cliente, placa diferente"
                    />
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                      onClick={() => { setHasVehicle2(!hasVehicle2); if (hasVehicle2) setVehicle2Form(emptyVehicle); }}
                    >
                      {hasVehicle2 ? "Remover" : "+ Adicionar"}
                    </button>
                  </div>
                  {hasVehicle2 && (
                    <VehicleFormFields
                      form={vehicle2Form}
                      setForm={setVehicle2Form}
                      plateInvalid={secondaryPlateInvalid}
                    />
                  )}
                </div>
              )}

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
              </div>

              {/* ④ Declaração */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="4"
                  label="Declaração assinada"
                  desc="Foto da declaração do cliente (opcional)"
                />
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <PhotoPicker
                    label="Foto da declaração"
                    photoUrl={declarationUrl}
                    onChange={setDeclarationUrl}
                  />
                  <div className="min-w-0 w-full flex-1">
                    <p className="text-sm text-[var(--muted)]">
                      Tire uma foto da declaração assinada pelo cliente. Clique na imagem para ampliar na tela de visualização.
                    </p>
                    {declarationUrl && (
                      <button type="button" className="mt-2 text-xs text-[var(--danger)] hover:underline" onClick={() => setDeclarationUrl("")}>
                        Remover declaração
                      </button>
                    )}
                  </div>
                </div>
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
                  desc="Todos os campos são opcionais"
                />

                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <PhotoPicker
                    label="Foto do cliente"
                    photoUrl={clientForm.photoUrl}
                    onChange={(url) =>
                      setClientForm((f) => ({ ...f, photoUrl: url }))
                    }
                  />

                  <div className="min-w-0 w-full flex-1 space-y-3">
                    <label className="block">
                      <span className="app-label">Nome completo</span>
                      <input
                        className="app-input"
                        value={clientForm.name}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Ex: João Silva"
                      />
                    </label>
                    <label className="block">
                      <span className="app-label">Empresa / Organização</span>
                      <input
                        className="app-input"
                        value={clientForm.company}
                        onChange={(e) =>
                          setClientForm((f) => ({ ...f, company: e.target.value }))
                        }
                        placeholder="Ex: AMR Construtora"
                      />
                    </label>
                    <label className="block">
                      <span className="app-label">Tipo de cliente</span>
                      <select
                        className="app-select"
                        value={clientForm.clientType}
                        onChange={(e) =>
                          setClientForm((f) => ({
                            ...f,
                            clientType: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {clientTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="app-label">Tipo de modalidade</span>
                      <select
                        className="app-select"
                        value={clientForm.clientModality}
                        onChange={(e) =>
                          setClientForm((f) => ({
                            ...f,
                            clientModality: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {clientModalityOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="app-label">CPF</span>
                        <input
                          className={`app-input ${cpfInvalid ? "border-[var(--danger)] focus:border-[var(--danger)] bg-[var(--danger-soft)]/30" : ""}`}
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
                        {cpfInvalid && (
                          <p className="mt-1 text-xs text-[var(--danger)]">
                            CPF inválido. Informe um CPF válido.
                          </p>
                        )}
                      </label>
                      <label className="block">
                        <span className="app-label">Telefone</span>
                        <input
                          className="app-input"
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
                  desc="Campos opcionais (aceita placa antiga ou Mercosul)"
                />
                <VehicleFormFields
                  form={vehicleForm}
                  setForm={setVehicleForm}
                  plateInvalid={primaryPlateInvalid}
                />
              </div>

              {/* ② b — 2º Veículo (se múltiplos permitidos) */}
              {allowMultipleVehicles && (
                <div className="app-panel space-y-4">
                  <div className="flex items-center justify-between">
                    <SectionHeader
                      number="2b"
                      label="Segundo veículo"
                      desc="Opcional — mesmo cliente, placa diferente"
                    />
                    <button
                      type="button"
                      className="text-xs font-medium text-[var(--accent)] hover:underline"
                      onClick={() => { setHasVehicle2(!hasVehicle2); if (hasVehicle2) setVehicle2Form(emptyVehicle); }}
                    >
                      {hasVehicle2 ? "Remover" : "+ Adicionar"}
                    </button>
                  </div>
                  {hasVehicle2 && (
                    <VehicleFormFields
                      form={vehicle2Form}
                      setForm={setVehicle2Form}
                      plateInvalid={secondaryPlateInvalid}
                    />
                  )}
                </div>
              )}

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
              </div>

              {/* ④ Declaração */}
              <div className="app-panel space-y-4">
                <SectionHeader
                  number="4"
                  label="Declaração assinada"
                  desc="Foto da declaração do cliente (opcional)"
                />
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                  <PhotoPicker
                    label="Foto da declaração"
                    photoUrl={declarationUrl}
                    onChange={setDeclarationUrl}
                  />
                  <div className="min-w-0 w-full flex-1">
                    <p className="text-sm text-[var(--muted)]">
                      Tire uma foto da declaração assinada pelo cliente. Clique na imagem para ampliar na tela de visualização.
                    </p>
                    {declarationUrl && (
                      <button type="button" className="mt-2 text-xs text-[var(--danger)] hover:underline" onClick={() => setDeclarationUrl("")}>
                        Remover declaração
                      </button>
                    )}
                  </div>
                </div>
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

      </div>
    </div>
  );
}
