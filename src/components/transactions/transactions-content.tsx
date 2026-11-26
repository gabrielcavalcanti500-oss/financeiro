import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  CreditCard,
  Pencil,
} from "lucide-react";
import { createTransaction } from "@/app/(dashboard)/lancamentos/actions";
import { DeletePurchaseButton } from "@/components/cards/delete-purchase-button";
import { createClient } from "@/lib/supabase/server";
import {
  currentYearMonth,
  formatDateBR,
  monthRange,
  todayISO,
} from "@/lib/finance/dates";
import { formatBRL } from "@/lib/finance/money";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { MonthNav } from "./month-nav";
import { TransactionForm } from "./transaction-form";

type SearchParams = Promise<{ ano?: string; mes?: string }>;

type TxRow = {
  id: string;
  type: "income" | "expense" | "transfer" | "card_payment";
  description: string;
  amount: number | string;
  transaction_date: string;
  status: "paid" | "pending";
  card_id: string | null;
  purchase_group_id: string | null;
  installment_number: number | null;
  installments_count: number | null;
  account: { name: string } | null;
  transfer_account: { name: string } | null;
  category: { name: string } | null;
  card: { name: string } | null;
};

const TYPE_STYLE = {
  income: { icon: ArrowUpCircle, color: "text-green-600", sign: "+" },
  expense: { icon: ArrowDownCircle, color: "text-red-600", sign: "−" },
  transfer: { icon: ArrowLeftRight, color: "text-gray-500", sign: "" },
  card_payment: { icon: CreditCard, color: "text-gray-500", sign: "−" },
} as const;

export async function TransactionsContent({ searchParams }: { searchParams: SearchParams }) {
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
  const { start, end } = monthRange(year, month);

  const [accountsRes, categoriesRes, txRes, summaryRes] = await Promise.all([
    supabase.from("financial_accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase.from("categories").select("id, name, type").order("name"),
    supabase
      .from("transactions")
      .select(
        "id, type, description, amount, transaction_date, status, card_id, purchase_group_id, " +
          "installment_number, installments_count, " +
          "account:financial_accounts!transactions_account_id_fkey(name), " +
          "transfer_account:financial_accounts!transactions_transfer_account_id_fkey(name), " +
          "category:categories(name), card:credit_cards(name)"
      )
      .gte("transaction_date", start)
      .lt("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("monthly_summary", { p_year: year, p_month: month }),
  ]);

  if (accountsRes.error || categoriesRes.error || txRes.error) {
    console.error("lancamentos:", accountsRes.error ?? categoriesRes.error ?? txRes.error);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar os lançamentos.
      </p>
    );
  }

  const accounts = accountsRes.data ?? [];
  const categories = categoriesRes.data ?? [];
  const transactions = (txRes.data ?? []) as unknown as TxRow[];
  const summary = summaryRes.data?.[0];
  const income = Number(summary?.total_income ?? 0);
  const expense = Number(summary?.total_expense ?? 0);

  return (
    <div className="space-y-6">
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Para registrar lançamentos, primeiro{" "}
          <Link href="/contas" className="font-medium text-green-600 hover:underline">
            crie uma conta
          </Link>
          .
        </div>
      ) : (
        <TransactionForm
          accounts={accounts}
          categories={categories}
          defaultDate={todayISO()}
          action={createTransaction}
          resetOnSuccess
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthNav year={year} month={month} />
        <div className="flex gap-4 text-sm">
          <span className="text-green-600">Receitas: {formatBRL(income)}</span>
          <span className="text-red-600">Despesas: {formatBRL(expense)}</span>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Nenhum lançamento neste mês.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {transactions.map((t) => {
            const style = TYPE_STYLE[t.type];
            const Icon = style.icon;
            const isCardExpense = t.type === "expense" && t.card_id !== null;
            const isCardPayment = t.type === "card_payment";
            const isInstallment = isCardExpense && (t.installments_count ?? 1) > 1;

            let details: string;
            if (t.type === "transfer") {
              details = `${t.account?.name ?? "?"} → ${t.transfer_account?.name ?? "?"}`;
            } else if (isCardPayment) {
              details = `Fatura ${t.card?.name ?? "cartão"} • ${t.account?.name ?? "conta"}`;
            } else if (isCardExpense) {
              details = [t.category?.name ?? "Sem categoria", `Cartão ${t.card?.name ?? ""}`.trim()].join(" • ");
            } else {
              details = [t.category?.name ?? "Sem categoria", t.account?.name].filter(Boolean).join(" • ");
            }

            return (
              <li key={t.id} className="flex items-center gap-2 p-4 sm:gap-3">
                <Icon className={`h-6 w-6 shrink-0 ${style.color}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.description}
                    {isInstallment && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {t.installment_number}/{t.installments_count}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDateBR(t.transaction_date)} • {details}
                    {t.status === "pending" && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Pendente
                      </span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 font-semibold ${style.color}`}>
                  {style.sign}
                  {formatBRL(Number(t.amount))}
                </span>

                {!isCardExpense && !isCardPayment && (
                  <Link
                    href={`/lancamentos/${t.id}/editar`}
                    aria-label={`Editar ${t.description}`}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                )}

                {isCardExpense && t.purchase_group_id ? (
                  <DeletePurchaseButton groupId={t.purchase_group_id} />
                ) : (
                  <DeleteTransactionButton id={t.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}