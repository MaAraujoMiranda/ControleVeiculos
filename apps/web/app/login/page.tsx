"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getErrorMessage } from "../../lib/api";
import { isLicenseBlocked } from "../../lib/license";
import { useAuth } from "../../components/auth-provider";
import { APP_NAME, APP_TAGLINE, BrandVehicleIcon } from "../../components/brand";

const features = [
  {
    icon: "⚡",
    title: "Busca instantânea",
    description: "Encontre clientes por placa, nome ou cartão em segundos.",
  },
  {
    icon: "🔐",
    title: "Sessão segura",
    description: "Cookie httpOnly com duração configurável e revogação total.",
  },
  {
    icon: "📊",
    title: "Visão completa",
    description: "Dashboard com métricas em tempo real da sua operação.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { session, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redirectAfterAuth() {
    try {
      const license = await api.getLicense();
      router.replace(isLicenseBlocked(license) ? "/subscription" : "/");
    } catch {
      // Se nao conseguir avaliar licenca, mantém fluxo seguro na assinatura.
      router.replace("/subscription");
    }
  }

  useEffect(() => {
    if (!loading && session) {
      void redirectAfterAuth();
    }
  }, [loading, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password });
      await redirectAfterAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Painel esquerdo — branding ── */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-10 xl:p-14 lg:flex lg:w-[58%] xl:w-[60%]"
        style={{
          background:
            "linear-gradient(145deg, #1E1B4B 0%, #3730A3 35%, #4F46E5 65%, #7C3AED 100%)",
        }}
      >
        {/* Círculos decorativos de fundo */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(167,139,250,0.6) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.8) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white shadow-lg shadow-black/10 backdrop-blur-sm">
            <BrandVehicleIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {APP_NAME}
            </p>
            <p className="text-xs text-indigo-300">{APP_TAGLINE}</p>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="relative space-y-10">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Plataforma ativa
            </span>

            <h1
              className="max-w-lg text-4xl font-bold leading-tight text-white xl:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Gestão completa do seu estacionamento.
            </h1>

            <p className="max-w-md text-base leading-relaxed text-indigo-200">
              Controle clientes, veículos e acessos com uma interface moderna,
              rápida e preparada para crescer com sua operação.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <span className="text-2xl leading-none">{f.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-indigo-200">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-indigo-400">
          Sessão protegida · API segura · Dados criptografados
        </p>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-[var(--background)] px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm">
              <BrandVehicleIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {APP_NAME}
            </span>
          </div>

          {/* Título */}
          <div className="space-y-1.5">
            <h2
              className="text-2xl font-bold text-[var(--foreground)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Entrar na plataforma
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Acesse com suas credenciais de administrador.
            </p>
          </div>

          {/* Erro */}
          {error ? <div className="app-status-error">{error}</div> : null}

          {/* Formulário */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="app-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                className="app-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="app-label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                className="app-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="app-button-primary w-full py-3 text-base"
              disabled={submitting || loading}
            >
              {submitting ? "Entrando..." : "Acessar painel"}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--subtle)]">
            Sessão segura por cookie httpOnly · Expira em 7 dias
          </p>
        </div>
      </div>
    </div>
  );
}
