import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth, shiftMonth, monthRange } from "@/lib/finance/dates";
import type { DonutItem } from "@/components/charts/expenses-donut";
import { AnnualReport, type YearRow } from "./annual-report";
import {
  MonthlyReport,
  type CategoryTotal,
  type TopExpense,
} from "./monthly-report";
import { ReportNav, type ReportKind } from "./report-nav";

type SearchParams = Promise<{ tipo?: string; ano?: string; mes?: string }>;

const ERROR_BOX =
  "rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300";

type CategoryRow = { category_name: string; category_color: string; total: number | string };

export async function ReportsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const now = currentYearMonth();
  const kind: ReportKind = params.tipo === "anual" ? "anual" : "mensal";

  const ano = Number(params.ano);
  const mes = Number(params.mes);
  const yearValid = Number.isInteger(ano) && ano >= 2000 && ano <= 2100;
  const monthValid = Number.isInteger(mes) && mes >= 1 && mes <= 12;
  const year = yearValid ? ano : now.year;
  const month = yearValid && monthValid ? mes : now.month;

  if (kind === "anual") {
    const { data, error } = await supabase.rpc("yearly_report", { p_year: year });
    if (error) {
      console.error("relatorio anual:", error.code, error.message);
      return (
        <div className="space-y-6">
          <ReportNav kind={kind} year={year} month={month} />
          <p className={ERROR_BOX}>Não foi possível carregar o relatório. Verifique se a migration foi aplicada.</p>
        </div>
      );
    }

    const rows: YearRow[] = (
      (data ?? []) as {
        ref_month: number;
        total_income: number | string;
        total_expense: number | string;
        ending_balance: number | string;
      }[]
    ).map((r) => ({
      month: r.ref_month,
      income: Number(r.total_income),
      expense: Number(r.total_expense),
      balance: Number(r.ending_balance),
    }));

    const lastMonthShown = year < now.year ? 12 : year === now.year ? now.month : 0;

    return (
      <div className="space-y-6">
        <ReportNav kind={kind} year={year} month={month} />
        <AnnualReport year={year} rows={rows} lastMonthShown={lastMonthShown} />
      </div>
    );
  }

  const prev = shiftMonth(year, month, -1);
  const { start, end } = monthRange(year, month);

  const [summaryRes, prevSummaryRes, expCatRes, incCatRes, topRes] = await Promise.all([
    supabase.rpc("monthly_summary", { p_year: year, p_month: month }),
    supabase.rpc("monthly_summary", { p_year: prev.year, p_month: prev.month }),
    supabase.rpc("expenses_by_category", { p_year: year, p_month: month }),
    supabase.rpc("income_by_category", { p_year: year, p_month: month }),
    supabase
      .from("transactions")
      .select("id, description, amount, transaction_date, category:categories(name)")
      .eq("type", "expense")
      .eq("status", "paid")
      .gte("transaction_date", start)
      .lt("transaction_date", end)
      .order("amount", { ascending: false })
      .limit(5),
  ]);

  const failed =
    summaryRes.error ?? prevSummaryRes.error ?? expCatRes.error ?? incCatRes.error ?? topRes.error;
  if (failed) {
    console.error("relatorio mensal:", failed.code, failed.message);
    return (
      <div className="space-y-6">
        <ReportNav kind={kind} year={year} month={month} />
        <p className={ERROR_BOX}>Não foi possível carregar o relatório. Verifique se a migration foi aplicada.</p>
      </div>
    );
  }

  const summary = summaryRes.data?.[0];
  const prevSummary = prevSummaryRes.data?.[0];

  const expenseCategories: DonutItem[] = ((expCatRes.data ?? []) as CategoryRow[]).map((c) => ({
    name: c.category_name,
    value: Number(c.total),
    color: c.category_color,
  }));

  const incomeCategories: CategoryTotal[] = ((incCatRes.data ?? []) as CategoryRow[]).map((c) => ({
    name: c.category_name,
    value: Number(c.total),
    color: c.category_color,
  }));

  const topExpenses: TopExpense[] = (
    (topRes.data ?? []) as unknown as {
      id: string;
      description: string;
      amount: number | string;
      transaction_date: string;
      category: { name: string } | null;
    }[]
  ).map((t) => ({
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    date: t.transaction_date,
    category: t.category?.name ?? "Sem categoria",
  }));

  return (
    <div className="space-y-6">
      <ReportNav kind={kind} year={year} month={month} />
      <MonthlyReport
        income={Number(summary?.total_income ?? 0)}
        expense={Number(summary?.total_expense ?? 0)}
        prevIncome={Number(prevSummary?.total_income ?? 0)}
        prevExpense={Number(prevSummary?.total_expense ?? 0)}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        topExpenses={topExpenses}
      />
    </div>
  );
}