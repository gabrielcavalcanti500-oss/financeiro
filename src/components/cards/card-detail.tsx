import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateBR,
  invoiceClosingISO,
  invoiceDueISO,
  invoiceMonthFor,
  todayISO,
} from "@/lib/finance/dates";
import { formatBRL, sumMoney } from "@/lib/finance/money";
import { DeletePurchaseButton } from "./delete-purchase-button";
import { InvoiceNav } from "./invoice-nav";
import { PayInvoiceForm } from "./pay-invoice-form";
import { PurchaseForm } from "./purchase-form";

type SearchParams = Promise<{ ano?: string; mes?: string }>;

type Item = {
  id: string;
  description: string;
  amount: number | string;
  purchase_date: string;
  installment_number: number | null;
  installments_count: number | null;
  purchase_group_id: string | null;
  category: { name: string } | null;
};

type Payment = {
  id: string;
  amount: number | string;
  transaction_date: string;
  account: { name: string } | null;
};

const BADGE = {
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  green: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
} as const;

function invoiceStatus(today: string, closing: string, due: string, total: number, remaining: number) {
  if (Math.round(total * 100) === 0) return { label: "Sem compras", tone: "gray" as const };
  if (Math.round(remaining * 100) <= 0) return { label: "Paga", tone: "green" as const };
  if (today < closing) return { label: "Aberta", tone: "blue" as const };
  if (today > due) return { label: "Vencida", tone: "red" as const };
  return { label: "Fechada", tone: "amber" as const };
}

const CARD =
  "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900";

export async function CardDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await connection();

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const query = await searchParams;

  const supabase = await createClient();

  const cardRes = await supabase
    .from("card_summary")
    .select("card_id, name, credit_limit, closing_day, due_day, used, available")
    .eq("card_id", id)
    .maybeSingle();

  if (cardRes.error) {
    console.error("cartao:", cardRes.error.code, cardRes.error.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar o cartão.
      </p>
    );
  }
  const card = cardRes.data;
  if (!card) notFound(); // não existe ou não é do usuário

  const today = todayISO();
  const ano = Number(query.ano);
  const mes = Number(query.mes);
  const valid =
    Number.isInteger(ano) && ano >= 2000 && ano <= 2100 && Number.isInteger(mes) && mes >= 1 && mes <= 12;
  const { year, month } = valid ? { year: ano, month: mes } : invoiceMonthFor(today, card.closing_day);

  const [accountsRes, categoriesRes, invoiceRes, itemsRes, paymentsRes] = await Promise.all([
    supabase.from("financial_accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase.from("categories").select("id, name").eq("type", "expense").order("name"),
    supabase
      .from("card_invoices")
      .select("total, paid")
      .eq("card_id", id)
      .eq("invoice_year", year)
      .eq("invoice_month", month)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select(
        "id, description, amount, purchase_date, installment_number, installments_count, purchase_group_id, category:categories(name)"
      )
      .eq("card_id", id)
      .eq("type", "expense")
      .eq("invoice_year", year)
      .eq("invoice_month", month)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, amount, transaction_date, account:financial_accounts!transactions_account_id_fkey(name)")
      .eq("card_id", id)
      .eq("type", "card_payment")
      .eq("invoice_year", year)
      .eq("invoice_month", month)
      .order("transaction_date", { ascending: false }),
  ]);

  const failed = accountsRes.error ?? categoriesRes.error ?? invoiceRes.error ?? itemsRes.error ?? paymentsRes.error;
  if (failed) {
    console.error("cartao detalhe:", failed.code, failed.message);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar a fatura.
      </p>
    );
  }

  const items = (itemsRes.data ?? []) as unknown as Item[];
  const payments = (paymentsRes.data ?? []) as unknown as Payment[];

  const total = Number(invoiceRes.data?.total ?? 0);
  const paid = Number(invoiceRes.data?.paid ?? 0);
  const remaining = sumMoney([total, -paid]);

  const closingISO = invoiceClosingISO(year, month, card.closing_day);
  const dueISO = invoiceDueISO(year, month, card.closing_day, card.due_day);
  const status = invoiceStatus(today, closingISO, dueISO, total, remaining);

  const limitCents = Math.round(Number(card.credit_limit) * 100);
  const usedCents = Math.round(Number(card.used) * 100);
  const percent = limitCents > 0 ? (usedCents / limitCents) * 100 : 0;
  const barColor = percent > 100 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">{card.name}</h2>
          <span className="text-xs text-gray-500">
            Fecha dia {card.closing_day} · Vence dia {card.due_day}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-gray-500">Limite {formatBRL(Number(card.credit_limit))}</span>
          <span className="text-gray-500">Usado {formatBRL(Number(card.used))}</span>
          <span className="font-semibold">Disponível {formatBRL(Number(card.available))}</span>
        </div>
      </section>

      <PurchaseForm
        cardId={id}
        categories={(categoriesRes.data ?? []) as { id: string; name: string }[]}
        defaultDate={today}
      />

      <InvoiceNav cardId={id} year={year} month={month} />

      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            Fecha em {formatDateBR(closingISO)} · Vence em {formatDateBR(dueISO)}
          </p>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[status.tone]}`}>{status.label}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-500">Total</p>
            <p className="text-lg font-bold">{formatBRL(total)}</p>
          </div>
          <div>
            <p className="text-gray-500">Pago</p>
            <p className="text-lg font-bold text-green-600">{formatBRL(paid)}</p>
          </div>
          <div>
            <p className="text-gray-500">Restante</p>
            <p className="text-lg font-bold">{formatBRL(remaining)}</p>
          </div>
        </div>

        {Math.round(remaining * 100) > 0 && (
          <PayInvoiceForm
            cardId={id}
            year={year}
            month={month}
            accounts={(accountsRes.data ?? []) as { id: string; name: string }[]}
            defaultAmount={remaining.toFixed(2).replace(".", ",")}
            defaultDate={today}
          />
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Compras da fatura</h2>
        {items.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
            Nenhuma compra nesta fatura.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.description}
                    {t.installments_count && t.installments_count > 1 && (
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {t.installment_number}/{t.installments_count}
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {formatDateBR(t.purchase_date)} • {t.category?.name ?? "Sem categoria"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-red-600">−{formatBRL(Number(t.amount))}</span>
                {t.purchase_group_id && <DeletePurchaseButton groupId={t.purchase_group_id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Pagamentos</h2>
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Pagamento</p>
                  <p className="text-xs text-gray-500">
                    {formatDateBR(p.transaction_date)} • {p.account?.name ?? "Conta"}
                  </p>
                </div>
                <span className="shrink-0 font-semibold text-green-600">{formatBRL(Number(p.amount))}</span>
                <DeleteTransactionButton id={p.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}