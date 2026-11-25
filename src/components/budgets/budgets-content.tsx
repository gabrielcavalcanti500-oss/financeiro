import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentYearMonth } from "@/lib/finance/dates";
import { formatBRL, sumMoney } from "@/lib/finance/money";
import { BudgetMonthNav } from "./budget-month-nav";
import { BudgetRow } from "./budget-row";
import { CopyBudgetsButton } from "./copy-budgets-button";

type SearchParams = Promise<{ ano?: string; mes?: string }>;

type Row = {
  category_id: string;
  category_name: string;
  category_color: string;
  budget_amount: number | string | null;
  spent: number | string;
};

export async function BudgetsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();

  const params = await searchParams;
  const supabase = await createClient();

  const now = currentYearMonth();
  const ano = Number(params.ano);
  const mes = Number(params.mes);
  const valid =
    Number.isInteger(ano) && ano >= 2000 && ano <= 2100 && Number.isInteger(mes) && mes >= 1 && mes <= 12;
  const year = valid ? ano : now.year;
  const month = valid ? mes : now.month;

  const { data, error } = await supabase.rpc("budget_progress", { p_year: year, p_month: month });

  if (error) {
    console.error("orcamentos:", error.code, error.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar os orçamentos. Verifique se a migration foi aplicada.
      </p>
    );
  }

  const rows = (data ?? []) as Row[];
  const totalBudget = sumMoney(rows.map((r) => Number(r.budget_amount ?? 0)));
  // Só soma o gasto das categorias que têm orçamento, para comparar de forma justa.
  const totalSpentBudgeted = sumMoney(
    rows.filter((r) => r.budget_amount !== null).map((r) => Number(r.spent))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BudgetMonthNav year={year} month={month} />
        <CopyBudgetsButton year={year} month={month} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Total orçado</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(totalBudget)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm text-gray-500">Gasto nas categorias orçadas</p>
          <p className="mt-1 text-xl font-bold">{formatBRL(totalSpentBudgeted)}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Digite o limite de cada categoria e saia do campo (ou tecle Enter) para salvar. Deixe vazio para remover.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Você ainda não tem categorias de despesa.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {rows.map((r) => (
            <BudgetRow
              // key inclui o mês: ao navegar, os campos são recriados com os valores certos
              key={`${r.category_id}-${year}-${month}`}
              categoryId={r.category_id}
              name={r.category_name}
              color={r.category_color}
              year={year}
              month={month}
              budget={r.budget_amount === null ? null : Number(r.budget_amount)}
              spent={Number(r.spent)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}