"use client";

import { useActionState } from "react";
import { updateCard, type ActionState } from "@/app/(dashboard)/cartoes/actions";

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function EditCardForm({
  id,
  name,
  creditLimit,
  closingDay,
  dueDay,
}: {
  id: string;
  name: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
}) {
  const [state, formAction, pending] = useActionState(updateCard, initialState);

  return (
    <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
        Editar cartão
      </summary>

      {/* key: após salvar, os campos recebem os valores atualizados */}
      <form key={`${name}-${creditLimit}-${closingDay}-${dueDay}`} action={formAction} className="mt-4">
        <input type="hidden" name="id" value={id} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Nome</label>
            <input name="name" required maxLength={40} defaultValue={name} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Limite</label>
            <input
              name="credit_limit"
              inputMode="decimal"
              defaultValue={creditLimit.toFixed(2).replace(".", ",")}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dia do fechamento</label>
            <input
              name="closing_day"
              type="number"
              min={1}
              max={28}
              required
              defaultValue={closingDay}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dia do vencimento</label>
            <input
              name="due_day"
              type="number"
              min={1}
              max={28}
              required
              defaultValue={dueDay}
              className={inputClass}
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Mudar fechamento ou vencimento vale para as compras novas: as já lançadas continuam nas mesmas
          faturas. Nas faturas antigas, as datas exibidas passam a usar os dias novos.
        </p>

        {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mt-3 text-sm text-green-600">Cartão atualizado!</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar alterações"}
        </button>
      </form>
    </details>
  );
}