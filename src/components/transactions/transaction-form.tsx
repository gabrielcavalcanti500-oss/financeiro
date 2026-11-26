"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ActionState } from "@/app/(dashboard)/lancamentos/actions";
import {
  formatDateBR,
  invoiceClosingISO,
  invoiceDueISO,
  invoiceMonthFor,
} from "@/lib/finance/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/labels";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: string };
export type CardOption = { id: string; name: string; closing_day: number; due_day: number };
type TxType = "expense" | "income" | "transfer" | "card";

export type TransactionInitial = {
  type: Exclude<TxType, "card">;
  description: string;
  amount: string; // já formatado para digitação, ex.: "45,90"
  date: string; // YYYY-MM-DD
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  payment_method: string | null;
  notes: string | null;
  paid: boolean;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  defaultDate: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  /** Se informado (mesmo vazio), habilita o tipo "Cartão". Na edição, não passe. */
  cards?: CardOption[];
  initial?: TransactionInitial;
  title?: string;
  submitLabel?: string;
  cancelHref?: string;
  resetOnSuccess?: boolean;
};

const initialState: ActionState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-sm font-medium text-gray-700 dark:text-gray-300";

const TYPE_OPTIONS: { value: TxType; label: string; active: string }[] = [
  { value: "expense", label: "Despesa", active: "bg-red-600 text-white" },
  { value: "income", label: "Receita", active: "bg-green-600 text-white" },
  { value: "transfer", label: "Transferência", active: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900" },
  { value: "card", label: "Cartão", active: "bg-indigo-600 text-white" },
];

export function TransactionForm({
  accounts,
  categories,
  defaultDate,
  action,
  cards,
  initial,
  title = "Novo lançamento",
  submitLabel = "Salvar lançamento",
  cancelHref,
  resetOnSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const cardList = cards ?? [];
  const cardEnabled = cards !== undefined;

  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [cardId, setCardId] = useState(cardList[0]?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const isCard = type === "card";
  const options = cardEnabled ? TYPE_OPTIONS : TYPE_OPTIONS.filter((o) => o.value !== "card");

  // Compra no cartão usa categorias de despesa.
  const categoryType = isCard ? "expense" : type;
  const filteredCategories = categories.filter((c) => c.type === categoryType);
  // A categoria inicial só vale se o tipo ainda for o original.
  const categoryDefault = initial && type === initial.type ? (initial.category_id ?? "") : "";

  // Prévia da fatura (informativa; o banco é quem decide de verdade).
  const selectedCard = cardList.find((c) => c.id === cardId);
  let invoiceInfo: string | null = null;
  if (isCard && selectedCard && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const inv = invoiceMonthFor(date, selectedCard.closing_day);
    const closing = invoiceClosingISO(inv.year, inv.month, selectedCard.closing_day);
    const due = invoiceDueISO(inv.year, inv.month, selectedCard.closing_day, selectedCard.due_day);
    invoiceInfo = `Entra na fatura que fecha em ${formatDateBR(closing)} e vence em ${formatDateBR(due)}.`;
  }

  const noCards = isCard && cardList.length === 0;

  return (
    <form
      ref={formRef}
      action={formAction}
      onReset={() => {
        // reset() volta os campos ao valor inicial; o estado da prévia acompanha.
        setDate(initial?.date ?? defaultDate);
        setCardId(cardList[0]?.id ?? "");
      }}
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <h2 className="font-semibold">{title}</h2>

      <input type="hidden" name="type" value={type} />
      <div
        className={`mt-4 grid gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 ${
          options.length === 4 ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`rounded-lg px-1 py-2 text-xs font-medium transition sm:px-2 sm:text-sm ${
              type === opt.value ? opt.active : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {noCards && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          Você ainda não tem cartão cadastrado.{" "}
          <Link href="/cartoes" className="font-medium underline">
            Cadastrar um cartão
          </Link>
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Descrição</label>
          <input
            name="description"
            required
            maxLength={100}
            placeholder={isCard ? "Ex.: Tênis" : "Ex.: Almoço"}
            defaultValue={initial?.description}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{isCard ? "Valor total" : "Valor"}</label>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={initial?.amount}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{isCard ? "Data da compra" : "Data"}</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={initial?.date ?? defaultDate}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {isCard ? (
          <>
            <div>
              <label className={labelClass}>Cartão</label>
              <select
                name="card_id"
                required
                defaultValue={cardList[0]?.id ?? ""}
                onChange={(e) => setCardId(e.target.value)}
                className={inputClass}
              >
                {cardList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
          </>
        ) : (
          <div>
            <label className={labelClass}>{type === "transfer" ? "Conta de origem" : "Conta"}</label>
            <select name="account_id" required defaultValue={initial?.account_id ?? ""} className={inputClass}>
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
        )}

        {type === "transfer" ? (
          <div>
            <label className={labelClass}>Conta de destino</label>
            <select
              name="transfer_account_id"
              required
              defaultValue={initial?.transfer_account_id ?? ""}
              className={inputClass}
            >
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
        ) : (
          <div>
            <label className={labelClass}>Categoria</label>
            {/* key recria o campo ao trocar de tipo */}
            <select key={type} name="category_id" defaultValue={categoryDefault} className={inputClass}>
              <option value="">Sem categoria</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {!isCard && (
          <div>
            <label className={labelClass}>Forma de pagamento</label>
            <select name="payment_method" defaultValue={initial?.payment_method ?? ""} className={inputClass}>
              <option value="">Não informar</option>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass}>Observações</label>
          <input
            name="notes"
            maxLength={500}
            placeholder="Opcional"
            defaultValue={initial?.notes ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {invoiceInfo && <p className="mt-3 text-xs text-gray-500">{invoiceInfo}</p>}

      {!isCard && (
        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            name="paid"
            defaultChecked={initial?.paid ?? true}
            className="h-4 w-4 accent-green-600"
          />
          Já foi {type === "income" ? "recebido" : type === "transfer" ? "realizado" : "pago"}
        </label>
      )}

      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.success && resetOnSuccess && (
        <p className="mt-3 text-sm text-green-600">{isCard ? "Compra salva!" : "Lançamento salvo!"}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || noCards}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : isCard ? "Salvar compra" : submitLabel}
        </button>
        {cancelHref && (
          <Link href={cancelHref} className="text-sm font-medium text-gray-500 hover:underline">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}