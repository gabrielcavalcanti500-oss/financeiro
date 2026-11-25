import Link from "next/link";
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle } from "lucide-react";
import { formatDateBR } from "@/lib/finance/dates";
import { formatBRL } from "@/lib/finance/money";

export type RecentTx = {
  id: string;
  type: "income" | "expense" | "transfer";
  description: string;
  amount: number | string;
  transaction_date: string;
  status: "paid" | "pending";
  category: { name: string } | null;
};

const STYLE = {
  income: { icon: ArrowUpCircle, color: "text-green-600", sign: "+" },
  expense: { icon: ArrowDownCircle, color: "text-red-600", sign: "−" },
  transfer: { icon: ArrowLeftRight, color: "text-gray-500", sign: "" },
} as const;

export function RecentTransactions({ items }: { items: RecentTx[] }) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Últimos lançamentos</h2>
        <Link href="/lancamentos" className="text-sm font-medium text-green-600 hover:underline">
          Ver todos
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Nenhum lançamento ainda.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {items.map((t) => {
            const s = STYLE[t.type];
            const Icon = s.icon;
            return (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <Icon className={`h-6 w-6 shrink-0 ${s.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDateBR(t.transaction_date)}
                    {t.type !== "transfer" && ` • ${t.category?.name ?? "Sem categoria"}`}
                    {t.status === "pending" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Pendente
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 font-semibold ${s.color}`}>
                  {s.sign}
                  {formatBRL(Number(t.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}