"use client";

import { type FormEvent, useEffect, useState } from "react";
import { api, getErrorMessage } from "../../lib/api";
import { useAuth } from "../../components/auth-provider";

export default function ProfilePage() {
  const { session, refreshSession } = useAuth();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user.name) setName(session.user.name);
  }, [session]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (name.trim() && name.trim() !== session?.user.name) {
        payload.name = name.trim();
      }
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setError("Nenhuma alteração para salvar.");
        return;
      }

      await api.updateProfile(payload);
      await refreshSession();

      setSuccess("Perfil atualizado com sucesso.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const initials = session?.user.name
    ? session.user.name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : "??";

  const roleLabel =
    session?.user.role === "ADMIN"
      ? "Administrador"
      : session?.user.role === "OPERATOR"
        ? "Operador"
        : "Consulta";

  return (
    <div className="space-y-6 py-2">
      {/* Cabeçalho */}
      <section className="app-panel app-rise-in">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl font-bold text-[var(--accent)]">
            {initials}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              {session?.user.name ?? "Meu Perfil"}
            </h1>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {session?.user.email} · {roleLabel}
            </p>
          </div>
        </div>
      </section>

      {error && <div className="app-status-error">{error}</div>}
      {success && <div className="app-status-success">{success}</div>}

      <form className="grid gap-6 xl:grid-cols-2" onSubmit={handleSubmit}>
        {/* Dados básicos */}
        <div className="app-panel space-y-5">
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              Dados do perfil
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Atualize seu nome de exibição no sistema.
            </p>
          </div>

          <label className="block">
            <span className="app-label">Nome</span>
            <input
              className="app-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </label>

          <label className="block">
            <span className="app-label">E-mail</span>
            <input
              className="app-input opacity-60"
              value={session?.user.email ?? ""}
              readOnly
              disabled
            />
            <p className="mt-1 text-xs text-[var(--muted)]">O e-mail não pode ser alterado.</p>
          </label>
        </div>

        {/* Alterar senha */}
        <div className="app-panel space-y-5">
          <div>
            <p className="text-lg font-semibold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
              Alterar senha
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Deixe em branco se não quiser alterar a senha.
            </p>
          </div>

          <label className="block">
            <span className="app-label">Senha atual</span>
            <input
              className="app-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Digite sua senha atual"
              autoComplete="current-password"
            />
          </label>

          <label className="block">
            <span className="app-label">Nova senha</span>
            <input
              className="app-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </label>

          <label className="block">
            <span className="app-label">Confirmar nova senha</span>
            <input
              className="app-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
            />
          </label>
        </div>

        <div className="xl:col-span-2">
          <button type="submit" className="app-button-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
