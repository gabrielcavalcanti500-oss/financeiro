"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { copyPreviousMonth } from "@/app/(dashboard)/orcamentos/actions";

export function CopyBudgetsButton({ year, month }: { year: number; month: number }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await copyPreviousMonth(year, month);
      if (result.error) {
        setMessage(result.error);
      } else if (!result.copied) {
        setMessage("Nada para copiar: o mês anterior não tem orçamentos novos para este mês.");
      } else {
        setMessage(`${result.copied} orçamento(s) copiado(s).`);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <Copy className="h-4 w-4" />
        {pending ? "Copiando..." : "Copiar do mês anterior"}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}