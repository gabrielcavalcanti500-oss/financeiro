"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCategory, type ActionState } from "@/app/(dashboard)/categorias/actions";

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function NewCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, initialState);
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
      <h2 className="font-semibold">Nova categoria</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div>
          <label className={labelClass}>Nome</label>
          <input name="name" required maxLength={40} placeholder="Ex.: Pets" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Tipo</label>
          <select name="type" defaultValue="expense" className={inputClass}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Cor</label>
          <input
            name="color"
            type="color"
            defaultValue="#16a34a"
            className="mt-1 h-10 w-16 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-950"
          />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Categoria criada!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Criar categoria"}
      </button>
    </form>
  );
}