import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from "lucide-react";
import { MonthlyBars, type MonthlyPoint } from "@/components/charts/monthly-bars";
import { WealthArea, type WealthPoint } from "@/components/charts/wealth-area";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { shortMonthLabel } from "@/lib/finance/dates";
import { formatBRL, sumMoney } from "@/lib/finance/money";

export type YearRow = { month: number; income: number; expense: number; balance: number };

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900";

export function AnnualReport({
  year,
  rows,
  lastMonthShown,
}: {
  year: number;
  rows: YearRow[];
  /** Último mês com dados reais (12 para anos passados, o mês atual no ano corrente). */
  lastMonthShown: number;
}) {
  const totalIncome = sumMoney(rows.map((r) => r.income));
  const totalExpense = sumMoney(rows.map((r) => r.expense));
  const result = sumMoney([totalIncome, -totalExpense]);
  const endingBalance = rows.find((r) => r.month === lastMonthShown)?.balance ?? 0;

  const bars: MonthlyPoint[] = rows.map((r) => ({
    label: shortMonthLabel(year, r.month),
    receitas: r.income,
    despesas: r.expense,
  }));

  // A linha do saldo para no último mês com dados (evita uma reta "inventada" no futuro).
  const wealth: WealthPoint[] = rows
    .filter((r) => r.month <= lastMonthShown)
    .map((r) => ({ label: shortMonthLabel(year, r.month), saldo: r.balance }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Receitas no ano" value={formatBRL(totalIncome)} icon={ArrowUpCircle} tone="income" />
        <SummaryCard title="Despesas no ano" value={formatBRL(totalExpense)} icon={ArrowDownCircle} tone="expense" />
        <SummaryCard
          title="Resultado do ano"
          value={formatBRL(result)}
          icon={Scale}
          tone={result >= 0 ? "income" : "expense"}
        />
        <SummaryCard title="Saldo total no fim do período" value={formatBRL(endingBalance)} icon={Wallet} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="font-semibold">Receitas x despesas por mês</h2>
          <div className="mt-3">
            <MonthlyBars data={bars} />
          </div>
        </section>

        <section className={CARD}>
          <h2 className="font-semibold">Evolução do saldo total</h2>
          <div className="mt-3">
            <WealthArea data={wealth} />
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Mês a mês</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500 dark:border-gray-800">
                <th className="p-3 font-medium">Mês</th>
                <th className="p-3 text-right font-medium">Receitas</th>
                <th className="p-3 text-right font-medium">Despesas</th>
                <th className="p-3 text-right font-medium">Resultado</th>
                <th className="p-3 text-right font-medium">Saldo final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => {
                const monthResult = sumMoney([r.income, -r.expense]);
                const future = r.month > lastMonthShown;
                return (
                  <tr key={r.month} className={future ? "text-gray-400" : ""}>
                    <td className="p-3 font-medium capitalize">{shortMonthLabel(year, r.month)}</td>
                    <td className="p-3 text-right">{formatBRL(r.income)}</td>
                    <td className="p-3 text-right">{formatBRL(r.expense)}</td>
                    <td
                      className={`p-3 text-right font-medium ${
                        future ? "" : monthResult < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {formatBRL(monthResult)}
                    </td>
                    <td className="p-3 text-right">{future ? "—" : formatBRL(r.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}