import Link from "next/link";
import { connection } from "next/server";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/finance/money";
import { CardDeleteButton } from "./card-delete-button";

type Row = {
  card_id: string;
  name: string;
  credit_limit: number | string;
  closing_day: number;
  due_day: number;
  used: number | string;
  available: number | string;
};

export async function CardList() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("card_summary")
    .select("card_id, name, credit_limit, closing_day, due_day, used, available")
    .order("name");

  if (error) {
    console.error("cartoes:", error.code, error.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar os cartões. Verifique se a migration foi aplicada.
      </p>
    );
  }

  const cards = (data ?? []) as Row[];

  if (cards.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
        Nenhum cartão cadastrado ainda.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => {
        const limitCents = Math.round(Number(c.credit_limit) * 100);
        const usedCents = Math.round(Number(c.used) * 100);
        const percent = limitCents > 0 ? (usedCents / limitCents) * 100 : 0;
        const barColor = percent > 100 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-green-500";

        return (
          <li
            key={c.card_id}
            className="relative rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-green-600/50 dark:border-gray-800 dark:bg-gray-900"
          >
            <Link href={`/cartoes/${c.card_id}`} className="block p-4 pr-14">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    Fecha dia {c.closing_day} · Vence dia {c.due_day}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-gray-500">Usado {formatBRL(Number(c.used))}</span>
                <span className="font-medium">Disponível {formatBRL(Number(c.available))}</span>
              </div>
            </Link>

            <div className="absolute right-2 top-2">
              <CardDeleteButton id={c.card_id} name={c.name} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}