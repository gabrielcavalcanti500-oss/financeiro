import { notFound } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { updateTransaction } from "@/app/(dashboard)/lancamentos/actions";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/finance/dates";
import { TransactionForm, type TransactionInitial } from "./transaction-form";

export async function EditTransactionContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();

  const [txRes, accountsRes, categoriesRes] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, description, amount, transaction_date, status, account_id, transfer_account_id, category_id, payment_method, notes"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("financial_accounts").select("id, name").order("name"),
    supabase.from("categories").select("id, name, type").order("name"),
  ]);

  if (txRes.error || accountsRes.error || categoriesRes.error) {
    console.error("editar lancamento:", txRes.error ?? accountsRes.error ?? categoriesRes.error);
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
        Não foi possível carregar o lançamento.
      </p>
    );
  }

  const tx = txRes.data;
  if (!tx) notFound(); // não existe ou não pertence ao usuário (o RLS esconde)

  const [year, month] = tx.transaction_date.split("-");

  const initial: TransactionInitial = {
    type: tx.type,
    description: tx.description,
    amount: Number(tx.amount).toFixed(2).replace(".", ","),
    date: tx.transaction_date,
    account_id: tx.account_id,
    transfer_account_id: tx.transfer_account_id,
    category_id: tx.category_id,
    payment_method: tx.payment_method,
    notes: tx.notes,
    paid: tx.status === "paid",
  };

  return (
    <TransactionForm
      accounts={accountsRes.data ?? []}
      categories={categoriesRes.data ?? []}
      defaultDate={todayISO()}
      action={updateTransaction.bind(null, id)}
      initial={initial}
      title="Editar dados"
      submitLabel="Salvar alterações"
      cancelHref={`/lancamentos?ano=${Number(year)}&mes=${Number(month)}`}
    />
  );
}