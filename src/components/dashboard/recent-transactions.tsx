import Link from "next/link";
import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, CreditCard } from "lucide-react";
import { formatDateBR } from "@/lib/finance/dates";
import { formatBRL } from "@/lib/finance/money";

export type RecentTx = {
  id: string;
  type: "income" | "expense" | "transfer" | "card_payment";
  description: string;
  amount: number | string;
  transaction_date: string;
  status: "paid" | "pending";
  category: { name: string } | null;
};

const NEUTRAL_BUBBLE = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

const STYLE = {
  income: {
    icon: ArrowUpRight,
    bubble: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    color: "text-green-600 dark:text-green-400",
    sign: "+",
  },
  expense: {
    icon: ArrowDownRight,
    bubble: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
    color: "text-red-600 dark:text-red-400",
    sign: "−",
  },
  transfer: { icon: ArrowLeftRight, bubble: NEUTRAL_BUBBLE, color: "text-gray-500", sign: "" },
  card_payment: { icon: CreditCard, bubble: NEUTRAL_BUBBLE, color: "text-gray-500", sign: "−" },
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
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {items.map((t) => {
            const s = STYLE[t.type];
            const Icon = s.icon;
            const showCategory = t.type === "income" || t.type === "expense";
            return (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.bubble}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDateBR(t.transaction_date)}
                    {showCategory && ` • ${t.category?.name ?? "Sem categoria"}`}
                    {t.status === "pending" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Pendente
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 font-semibold tabular-nums ${s.color}`}>
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