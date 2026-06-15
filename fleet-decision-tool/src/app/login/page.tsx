"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent font-display text-lg font-bold text-card">
            F
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-ink">Fleet Decision Tool</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-inkfaint">Internal · sign in</p>
          </div>
        </div>

        <form
          action={formAction}
          className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(42,38,32,0.04)]"
        >
          <label className="mb-3 block space-y-1 text-sm">
            <span className="text-inksoft">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="mb-4 block space-y-1 text-sm">
            <span className="text-inksoft">Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink focus:border-accent focus:outline-none"
            />
          </label>

          {error && (
            <p className="mb-3 rounded-lg bg-dangersoft px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-accent px-4 py-2 text-sm font-medium text-card transition-colors hover:bg-accentink disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-inkfaint">
          Acceso restringido. ¿Problemas para entrar? Contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}
