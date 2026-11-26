"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCard } from "@/app/(dashboard)/cartoes/actions";

export function CardDeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Excluir o cartão "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCard(id);
      if (result.error) window.alert(result.error);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={`Excluir ${name}`}
      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}