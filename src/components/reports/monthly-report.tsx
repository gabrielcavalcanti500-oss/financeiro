import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { ExpensesDonut, type DonutItem } from "@/components/charts/expenses-donut";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatDateBR } from "@/lib/finance/dates";
import { formatBRL, percentChange, sumMoney } from "@/lib/finance/money";

export type CategoryTotal = { name: string; color: string; value: number };
export type TopExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
};

type Props = {
  income: number;
  expense: number;
  prevIncome: number;
  prevExpense: number;
  expenseCategories: DonutItem[];
  incomeCategories: CategoryTotal[];
  topExpenses: TopExpense[];
};

function Variation({
  current,
  previous,
  goodWhenUp,
}: {
  current: number;
  previous: number;
  goodWhenUp: boolean;
}) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <p className="mt-1 text-xs text-gray-500">Sem base de comparação no mês anterior</p>;
  }
  if (Math.round(change) === 0) {
    return <p className="mt-1 text-xs text-gray-500">Igual ao mês anterior</p>;
  }
  const up = change > 0;
  const good = up === goodWhenUp;
  return (
    <p className={`mt-1 text-xs font-medium ${good ? "text-green-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(change).toFixed(0)}% vs mês anterior
    </p>
  );
}

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900";

export function MonthlyReport({
  income,
  expense,
  prevIncome,
  prevExpense,
  expenseCategories,
  incomeCategories,
  topExpenses,
}: Props) {
  const result = sumMoney([income, -expense]);
  const prevResult = sumMoney([prevIncome, -prevExpense]);
  const incomeTotalCents = incomeCategories.reduce((acc, c) => acc + Math.round(c.value * 100), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Receitas"
          value={formatBRL(income)}
          icon={ArrowUpCircle}
          tone="income"
          footer={<Variation current={income} previous={prevIncome} goodWhenUp />}
        />
        <SummaryCard
          title="Despesas"
          value={formatBRL(expense)}
          icon={ArrowDownCircle}
          tone="expense"
          footer={<Variation current={expense} previous={prevExpense} goodWhenUp={false} />}
        />
        <SummaryCard
          title="Resultado"
          value={formatBRL(result)}
          icon={Scale}
          tone={result >= 0 ? "income" : "expense"}
          footer={<Variation current={result} previous={prevResult} goodWhenUp />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="font-semibold">Despesas por categoria</h2>
          <div className="mt-3">
            {expenseCategories.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">Sem despesas pagas neste mês.</p>
            ) : (
              <ExpensesDonut data={expenseCategories} />
            )}
          </div>
        </section>

        <section className={CARD}>
          <h2 className="font-semibold">Receitas por categoria</h2>
          {incomeCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">Sem receitas pagas neste mês.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {incomeCategories.map((c) => {
                const percent =
                  incomeTotalCents > 0 ? (Math.round(c.value * 100) / incomeTotalCents) * 100 : 0;
                return (
                  <li key={c.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-gray-500">
                        {formatBRL(c.value)} · {percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Maiores despesas do mês</h2>
        {topExpenses.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            Nenhuma despesa paga neste mês.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {topExpenses.map((t, index) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.description}</p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDateBR(t.date)} • {t.category}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-red-600">{formatBRL(t.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}