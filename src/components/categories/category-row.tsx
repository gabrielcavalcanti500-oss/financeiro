"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { deleteCategory, updateCategory } from "@/app/(dashboard)/categorias/actions";

type Props = { id: string; name: string; color: string };

export function CategoryRow({ id, name, color }: Props) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftColor, setDraftColor] = useState(color);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit() {
    setDraftName(name);
    setDraftColor(color);
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
      const result = await updateCategory(id, draftName, draftColor);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Excluir a categoria "${name}"? Os lançamentos dela ficarão como "Sem categoria".`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.error) window.alert(result.error);
    });
  }

  const iconButton =
    "rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800";

  if (editing) {
    return (
      <li className="p-3">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={draftColor}
            onChange={(e) => setDraftColor(e.target.value)}
            className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-700 dark:bg-gray-950"
          />
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={40}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950"
          />
          <button onClick={save} disabled={pending} aria-label="Salvar" className={`${iconButton} hover:text-green-600`}>
            <Check className="h-4 w-4" />
          </button>
          <button onClick={cancel} disabled={pending} aria-label="Cancelar" className={iconButton}>
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
      <button onClick={startEdit} disabled={pending} aria-label={`Editar ${name}`} className={iconButton}>
        <Pencil className="h-4 w-4" />
      </button>
      <button
        onClick={remove}
        disabled={pending}
        aria-label={`Excluir ${name}`}
        className={`${iconButton} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}