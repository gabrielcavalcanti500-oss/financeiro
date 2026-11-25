import Link from "next/link";
import { connection } from "next/server";
import { ArrowDownCircle, ArrowUpCircle, Scale, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, monthLabel, shiftMonth, shortMonthLabel } from "@/lib/finance/dates";
import { formatBRL, sumMoney } from "@/lib/finance/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/labels";
import { ExpensesDonut, type DonutItem } from "@/components/charts/expenses-donut";
import { MonthlyBars, type MonthlyPoint } from "@/components/charts/monthly-bars";
import { RecentTransactions, type RecentTx } from "./recent-transactions";
import { SummaryCard } from "./summary-card";

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900";

export async function DashboardContent() {
  await connection();

  const supabase = await createClient();
  const { year, month } = currentYearMonth();

  const [balancesRes, summaryRes, categoriesRes, evolutionRes, recentRes] = await Promise.all([
    supabase
      .from("account_balances")
      .select("account_id, name, balance, type")
      .eq("is_archived", false)
      .order("name"),
    supabase.rpc("monthly_summary", { p_year: year, p_month: month }),
    supabase.rpc("expenses_by_category", { p_year: year, p_month: month }),
    supabase.rpc("monthly_evolution", { p_year: year, p_month: month, p_months: 6 }),
    supabase
      .from("transactions")
      .select("id, type, description, amount, transaction_date, status, category:categories(name)")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const failed =
    balancesRes.error ?? summaryRes.error ?? categoriesRes.error ?? evolutionRes.error ?? recentRes.error;
  if (failed) {
    console.error("dashboard:", failed.code, failed.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar os dados. Verifique se as migrations e permissões foram aplicadas.
      </p>
    );
  }

  const accounts = balancesRes.data ?? [];
  const summary = summaryRes.data?.[0];

  const totalBalance = sumMoney(accounts.map((a) => Number(a.balance)));
  const income = Number(summary?.total_income ?? 0);
  const expense = Number(summary?.total_expense ?? 0);
  const result = sumMoney([income, -expense]);

  const donutData: DonutItem[] = (
    (categoriesRes.data ?? []) as { category_name: string; category_color: string; total: number | string }[]
  ).map((c) => ({ name: c.category_name, value: Number(c.total), color: c.category_color }));

  const monthlyData: MonthlyPoint[] = (
    (evolutionRes.data ?? []) as {
      ref_year: number;
      ref_month: number;
      total_income: number | string;
      total_expense: number | string;
    }[]
  ).map((m) => ({
    label: shortMonthLabel(m.ref_year, m.ref_month),
    receitas: Number(m.total_income),
    despesas: Number(m.total_expense),
  }));

  const recent = (recentRes.data ?? []) as unknown as RecentTx[];

  // Evita warning de variável sem uso caso a evolução venha vazia
  void shiftMonth;

  return (
    <>
      <p className="text-sm text-gray-500">{monthLabel(year, month)}</p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Saldo total" value={formatBRL(totalBalance)} icon={Wallet} />
        <SummaryCard title="Receitas do mês" value={formatBRL(income)} icon={ArrowUpCircle} tone="income" />
        <SummaryCard title="Despesas do mês" value={formatBRL(expense)} icon={ArrowDownCircle} tone="expense" />
        <SummaryCard
          title="Resultado do mês"
          value={formatBRL(result)}
          icon={Scale}
          tone={result >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="font-semibold">Despesas por categoria</h2>
          <div className="mt-3">
            {donutData.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">Sem despesas pagas neste mês.</p>
            ) : (
              <ExpensesDonut data={donutData} />
            )}
          </div>
        </section>

        <section className={CARD}>
          <h2 className="font-semibold">Receitas x despesas (6 meses)</h2>
          <div className="mt-3">
            <MonthlyBars data={monthlyData} />
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Suas contas</h2>
            <Link href="/contas" className="text-sm font-medium text-green-600 hover:underline">
              Gerenciar
            </Link>
          </div>

          {accounts.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
              Você ainda não tem contas.{" "}
              <Link href="/contas" className="font-medium text-green-600 hover:underline">
                Crie a primeira
              </Link>
              .
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
              {accounts.map((a) => (
                <li key={a.account_id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-500">{ACCOUNT_TYPE_LABELS[a.type] ?? a.type}</p>
                  </div>
                  <span className={`font-semibold ${Number(a.balance) < 0 ? "text-red-600" : ""}`}>
                    {formatBRL(Number(a.balance))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <RecentTransactions items={recent} />
      </div>
    </>
  );
}