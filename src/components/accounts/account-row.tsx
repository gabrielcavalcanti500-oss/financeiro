"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Trash2, X } from "lucide-react";
import {
  deleteAccount,
  setAccountArchived,
  updateAccount,
} from "@/app/(dashboard)/contas/actions";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/labels";
import { formatBRL } from "@/lib/finance/money";

type Props = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  balance: number;
  archived: boolean;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";
const labelClass = "text-xs font-medium text-gray-600 dark:text-gray-400";
const iconButton =
  "rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800";

function toInput(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export function AccountRow({ id, name, type, initialBalance, balance, archived }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftType, setDraftType] = useState(type);
  const [draftBalance, setDraftBalance] = useState(toInput(initialBalance));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setDraftName(name);
    setDraftType(type);
    setDraftBalance(toInput(initialBalance));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setError(null);
    setEditing(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateAccount(id, draftName, draftType, draftBalance);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function toggleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await setAccountArchived(id, !archived);
      if (result.error) setError(result.error);
    });
  }

  function remove() {
    setError(null);
    if (!window.confirm(`Excluir a conta "${name}"?`)) return;

    startTransition(async () => {
      const first = await deleteAccount(id, false);
      if (first.success) return;

      if (first.needsConfirmation) {
        const ok = window.confirm(
          `A conta "${name}" tem ${first.count} lançamento(s), incluindo transferências com outras contas.\n\n` +
            `Excluir a conta e TODOS esses lançamentos? O saldo das outras contas pode mudar. ` +
            `Isso não pode ser desfeito.`
        );
        if (!ok) return;

        const second = await deleteAccount(id, true);
        if (second.error) setError(second.error);
        return;
      }

      if (first.error) setError(first.error);
    });
  }

  if (editing) {
    return (
      <li className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Nome</label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={60}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              className={inputClass}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Saldo inicial</label>
            <input
              value={draftBalance}
              onChange={(e) => setDraftBalance(e.target.value)}
              inputMode="decimal"
              className={inputClass}
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Alterar o saldo inicial muda o saldo atual na mesma quantia.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            {pending ? "Salvando..." : "Salvar"}
          </button>
          <button
            onClick={cancel}
            disabled={pending}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`p-4 ${archived ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-gray-500">
            {ACCOUNT_TYPE_LABELS[type] ?? type}
            {archived && (
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Arquivada
              </span>
            )}
          </p>
        </div>

        <span className={`shrink-0 font-semibold ${balance < 0 ? "text-red-600" : ""}`}>
          {formatBRL(balance)}
        </span>

        <button onClick={startEdit} disabled={pending} aria-label={`Editar ${name}`} className={iconButton}>
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={toggleArchive}
          disabled={pending}
          aria-label={archived ? `Reativar ${name}` : `Arquivar ${name}`}
          title={archived ? "Reativar" : "Arquivar"}
          className={iconButton}
        >
          {archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
        </button>
        <button
          onClick={remove}
          disabled={pending}
          aria-label={`Excluir ${name}`}
          className={`${iconButton} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}