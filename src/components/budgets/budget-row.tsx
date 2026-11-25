"use client";

import { useState, useTransition } from "react";
import { saveBudget } from "@/app/(dashboard)/orcamentos/actions";
import { formatBRL } from "@/lib/finance/money";

type Props = {
  categoryId: string;
  name: string;
  color: string;
  year: number;
  month: number;
  budget: number | null;
  spent: number;
};

export function BudgetRow({ categoryId, name, color, year, month, budget, spent }: Props) {
  const [value, setValue] = useState(budget === null ? "" : budget.toFixed(2).replace(".", ","));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Comparação em centavos, para não depender de ponto flutuante.
  const spentCents = Math.round(spent * 100);
  const budgetCents = budget === null ? 0 : Math.round(budget * 100);
  const hasBudget = budget !== null && budgetCents > 0;
  const percent = hasBudget ? (spentCents / budgetCents) * 100 : 0;
  const exceeded = hasBudget && spentCents > budgetCents;
  const warning = hasBudget && !exceeded && percent >= 80;

  const barColor = exceeded ? "bg-red-500" : warning ? "bg-amber-500" : "bg-green-500";
  const remainingCents = budgetCents - spentCents;

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveBudget(categoryId, year, month, value);
      if (result.error) setError(result.error);
    });
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">R$</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            disabled={pending}
            inputMode="decimal"
            placeholder="Sem limite"
            aria-label={`Orçamento de ${name}`}
            className="w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950"
          />
        </div>
      </div>

      {hasBudget ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-gray-500">
              Gasto {formatBRL(spent)} ({percent.toFixed(0)}%)
            </span>
            <span className={exceeded ? "font-medium text-red-600" : "text-gray-500"}>
              {exceeded
                ? `Estourou em ${formatBRL(Math.abs(remainingCents) / 100)}`
                : `Restam ${formatBRL(remainingCents / 100)}`}
            </span>
          </div>
        </div>
      ) : (
        spentCents > 0 && (
          <p className="mt-2 text-xs text-gray-500">Gasto no mês: {formatBRL(spent)} (sem limite definido)</p>
        )
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </li>
  );
}