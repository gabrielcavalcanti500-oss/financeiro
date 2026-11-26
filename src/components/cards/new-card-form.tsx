"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCard, type ActionState } from "@/app/(dashboard)/cartoes/actions";

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function NewCardForm() {
  const [state, formAction, pending] = useActionState(createCard, initialState);
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
      <h2 className="font-semibold">Novo cartão</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Nome</label>
          <input name="name" required maxLength={40} placeholder="Ex.: Nubank" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Limite</label>
          <input name="credit_limit" inputMode="decimal" placeholder="5000,00" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Dia do fechamento</label>
          <input name="closing_day" type="number" min={1} max={28} required placeholder="Ex.: 3" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Dia do vencimento</label>
          <input name="due_day" type="number" min={1} max={28} required placeholder="Ex.: 10" className={inputClass} />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Cartão criado!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Criar cartão"}
      </button>
    </form>
  );
}