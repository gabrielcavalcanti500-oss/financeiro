import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACCOUNT_TYPE_LABELS } from "@/lib/finance/labels";
import { formatBRL } from "@/lib/finance/money";

export async function AccountList() {
  // Componente dinâmico: roda a cada requisição (o Supabase usa Date.now()
  // internamente, o que o Cache Components não permite durante a pré-geração).
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_balances")
    .select("account_id, name, balance, type")
    .eq("is_archived", false)
    .order("name");

  if (error) {
    return <p className="text-sm text-red-600">Não foi possível carregar as contas.</p>;
  }

  if (!data || data.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
        Nenhuma conta cadastrada ainda.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {data.map((a) => (
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
  );
}