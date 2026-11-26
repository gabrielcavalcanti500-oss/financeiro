"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCardPurchase, type ActionState } from "@/app/(dashboard)/cartoes/actions";

type Category = { id: string; name: string };

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function PurchaseForm({
  cardId,
  categories,
  defaultDate,
}: {
  cardId: string;
  categories: Category[];
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(createCardPurchase, initialState);
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
      <h2 className="font-semibold">Nova compra no cartão</h2>
      <input type="hidden" name="card_id" value={cardId} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição</label>
          <input name="description" required maxLength={100} placeholder="Ex.: Tênis" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Valor total</label>
          <input name="total" required inputMode="decimal" placeholder="0,00" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Parcelas</label>
          <input
            name="installments"
            type="number"
            min={1}
            max={48}
            defaultValue={1}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Data da compra</label>
          <input name="date" type="date" required defaultValue={defaultDate} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Categoria</label>
          <select name="category_id" defaultValue="" className={inputClass}>
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Observações</label>
          <input name="notes" maxLength={500} placeholder="Opcional" className={inputClass} />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Compra salva!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar compra"}
      </button>
    </form>
  );
}