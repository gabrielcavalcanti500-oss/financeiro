"use client";

import { useActionState } from "react";
import { payInvoice, type ActionState } from "@/app/(dashboard)/cartoes/actions";

type Account = { id: string; name: string };

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

export function PayInvoiceForm({
  cardId,
  year,
  month,
  accounts,
  defaultAmount,
  defaultDate,
}: {
  cardId: string;
  year: number;
  month: number;
  accounts: Account[];
  defaultAmount: string; // ex.: "350,00"
  defaultDate: string;
}) {
  const [state, formAction, pending] = useActionState(payInvoice, initialState);

  if (accounts.length === 0) {
    return <p className="text-sm text-gray-500">Crie uma conta para poder pagar a fatura.</p>;
  }

  return (
    <form action={formAction} className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
      <h3 className="text-sm font-semibold">Pagar esta fatura</h3>
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Pagar com a conta</label>
          <select name="account_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Valor</label>
          {/* key: ao mudar de fatura ou de restante, o campo recebe o novo valor sugerido */}
          <input
            key={`${year}-${month}-${defaultAmount}`}
            name="amount"
            required
            inputMode="decimal"
            defaultValue={defaultAmount}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Data do pagamento</label>
          <input name="date" type="date" required defaultValue={defaultDate} className={inputClass} />
        </div>
      </div>

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-3 text-sm text-green-600">Pagamento registrado!</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar pagamento"}
      </button>
    </form>
  );
}