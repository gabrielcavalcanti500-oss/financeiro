"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAccount, type ActionState } from "@/app/(dashboard)/contas/actions";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/labels";

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";

export function NewAccountForm() {
  const [state, formAction, pending] = useActionState(createAccount, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h2 className="font-semibold">Nova conta</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
          <input name="name" required placeholder="Ex.: Nubank" className={inputClass} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
          <select name="type" defaultValue="checking" className={inputClass}>
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo inicial</label>
          <input name="initial_balance" inputMode="decimal" placeholder="0,00" className={inputClass} />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Conta criada!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Criar conta"}
      </button>
    </form>
  );
}