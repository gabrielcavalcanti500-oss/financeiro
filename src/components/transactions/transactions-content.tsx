import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeftRight, CreditCard, Plus, Search } from "lucide-react";
import { DeletePurchaseButton } from "@/components/cards/delete-purchase-button";
import { categoryIcon } from "@/lib/finance/category-icons";
import { currentYearMonth, dayLabel, monthRange, todayISO } from "@/lib/finance/dates";
import { formatBRL, sumMoney } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { MonthNav } from "./month-nav";

type SearchParams = Promise<{ ano?: string; mes?: string; tipo?: string; q?: string }>;

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
  category: { name: string; color: string } | null;
  card: { name: string } | null;
};

type Filter = "todos" | "receitas" | "despesas" | "cartao";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "receitas", label: "Receitas" },
  { value: "despesas", label: "Despesas" },
  { value: "cartao", label: "Cartão" },
];

const AMOUNT_STYLE = {
  income: { color: "text-green-600 dark:text-green-400", sign: "+" },
  expense: { color: "text-red-600 dark:text-red-400", sign: "−" },
  transfer: { color: "text-gray-500", sign: "" },
  card_payment: { color: "text-gray-500", sign: "−" },
} as const;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function matchesFilter(t: TxRow, filter: Filter) {
  if (filter === "receitas") return t.type === "income";
  if (filter === "despesas") return t.type === "expense";
  if (filter === "cartao") return t.card_id !== null;
  return true;
}

function RowIcon({ t }: { t: TxRow }) {
  if (t.type === "transfer" || t.type === "card_payment") {
    const Icon = t.type === "transfer" ? ArrowLeftRight : CreditCard;
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800">
        <Icon className="h-5 w-5" />
      </span>
    );
  }
  const Icon = categoryIcon(t.category?.name ?? "");
  const color = t.category?.color ?? "#94a3b8";
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}26`, color }}
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

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

  const filter: Filter = FILTERS.some((f) => f.value === params.tipo) ? (params.tipo as Filter) : "todos";
  const q = (params.q ?? "").trim().slice(0, 60);

  const [txRes, summaryRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, description, amount, transaction_date, status, card_id, purchase_group_id, " +
        "installment_number, installments_count, " +
        "account:financial_accounts!transactions_account_id_fkey(name), " +
        "transfer_account:financial_accounts!transactions_transfer_account_id_fkey(name), " +
        "category:categories(name, color), card:credit_cards(name)"
      )
      .gte("transaction_date", start)
      .lt("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("monthly_summary", { p_year: year, p_month: month }),
  ]);

  if (txRes.error) {
    console.error("lancamentos:", txRes.error.code, txRes.error.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar os lançamentos.
      </p>
    );
  }

  const all = (txRes.data ?? []) as unknown as TxRow[];
  const summary = summaryRes.data?.[0];
  const income = Number(summary?.total_income ?? 0);
  const expense = Number(summary?.total_expense ?? 0);
  const result = sumMoney([income, -expense]);

  const needle = normalize(q);
  const filtered = all.filter((t) => {
    if (!matchesFilter(t, filter)) return false;
    if (!needle) return true;
    const haystack = normalize(
      [t.description, t.category?.name, t.account?.name, t.card?.name].filter(Boolean).join(" ")
    );
    return haystack.includes(needle);
  });

  // Agrupa por dia (a lista já vem ordenada da mais recente para a mais antiga).
  const groups: { date: string; items: TxRow[] }[] = [];
  for (const t of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.date === t.transaction_date) last.items.push(t);
    else groups.push({ date: t.transaction_date, items: [t] });
  }

  const today = todayISO();
  const filterHref = (value: Filter) =>
    `/lancamentos?ano=${year}&mes=${month}${value !== "todos" ? `&tipo=${value}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""
    }`;

  return (
    <div className="space-y-5">
      <MonthNav year={year} month={month} />

      {/* Resumo do mês */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-2xl border border-gray-200/80 bg-white py-3 text-center shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
        <div className="min-w-0 px-2">
          <p className="text-xs text-gray-500">Receitas</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-green-600 dark:text-green-400 sm:text-base">
            {formatBRL(income)}
          </p>
        </div>
        <div className="min-w-0 px-2">
          <p className="text-xs text-gray-500">Despesas</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-red-600 dark:text-red-400 sm:text-base">
            {formatBRL(expense)}
          </p>
        </div>
        <div className="min-w-0 px-2">
          <p className="text-xs text-gray-500">Resultado</p>
          <p
            className={`mt-0.5 truncate text-sm font-bold tabular-nums sm:text-base ${result < 0 ? "text-red-600 dark:text-red-400" : ""
              }`}
          >
            {formatBRL(result)}
          </p>
        </div>
      </div>

      {/* Busca */}
      <form action="/lancamentos" method="get" className="relative">
        <input type="hidden" name="ano" value={year} />
        <input type="hidden" name="mes" value={month} />
        {filter !== "todos" && <input type="hidden" name="tipo" value={filter} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por descrição, categoria ou conta"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-800 dark:bg-gray-900"
        />
      </form>

      {/* Filtros */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={filterHref(f.value)}
            aria-current={filter === f.value ? "true" : undefined}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${filter === f.value
              ? "border-green-600 bg-green-600 text-white"
              : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Lista */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-500">
            {all.length === 0 ? "Nenhum lançamento neste mês." : "Nada encontrado com esses filtros."}
          </p>
          {all.length === 0 && (
            <Link
              href="/lancamentos/novo"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date}>
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {dayLabel(g.date, today)}
              </h2>
              <ul className="mt-2 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
                {g.items.map((t) => {
                  const amountStyle = AMOUNT_STYLE[t.type];
                  const isCardExpense = t.type === "expense" && t.card_id !== null;
                  const isCardPayment = t.type === "card_payment";
                  const isInstallment = isCardExpense && (t.installments_count ?? 1) > 1;
                  const editable = !isCardExpense && !isCardPayment;

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

                  const content = (
                    <>
                      <RowIcon t={t} />
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
                          {details}
                          {t.status === "pending" && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              Pendente
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={`shrink-0 font-semibold tabular-nums ${amountStyle.color}`}>
                        {amountStyle.sign}
                        {formatBRL(Number(t.amount))}
                      </span>
                    </>
                  );

                  return (
                    <li key={t.id} className="flex items-center">
                      {editable ? (
                        <Link
                          href={`/lancamentos/${t.id}/editar`}
                          aria-label={`Editar ${t.description}`}
                          className="flex min-w-0 flex-1 items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3 p-4">{content}</div>
                      )}
                      <div className="pr-2">
                        {isCardExpense && t.purchase_group_id ? (
                          <DeletePurchaseButton groupId={t.purchase_group_id} />
                        ) : (
                          <DeleteTransactionButton id={t.id} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}