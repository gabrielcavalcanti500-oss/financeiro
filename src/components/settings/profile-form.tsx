"use client";

import { useActionState } from "react";
import { updateProfile, type ActionState } from "@/app/(dashboard)/configuracoes/actions";

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h2 className="font-semibold">Perfil</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nome</label>
          <input
            name="full_name"
            required
            maxLength={80}
            defaultValue={fullName}
            autoComplete="name"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>E-mail</label>
          <input
            value={email}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-gray-800`}
          />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Perfil atualizado!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}