import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AccountRow } from "./account-row";

type AccountData = {
  id: string;
  name: string;
  type: string;
  initial_balance: number | string;
  is_archived: boolean;
};

const LIST =
  "divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900";

export async function AccountList() {
  await connection();

  const supabase = await createClient();
  const [accountsRes, balancesRes] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("id, name, type, initial_balance, is_archived")
      .order("name"),
    supabase.from("account_balances").select("account_id, balance"),
  ]);

  if (accountsRes.error || balancesRes.error) {
    console.error("contas:", accountsRes.error ?? balancesRes.error);
    return <p className="text-sm text-red-600">Não foi possível carregar as contas.</p>;
  }

  const balanceById = new Map<string, number>(
    (balancesRes.data ?? []).map((b: { account_id: string; balance: number | string }) => [
      b.account_id,
      Number(b.balance),
    ])
  );

  const accounts = (accountsRes.data ?? []) as AccountData[];
  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);

  if (accounts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
        Nenhuma conta cadastrada ainda.
      </p>
    );
  }

  const renderRow = (a: AccountData) => (
    <AccountRow
      key={a.id}
      id={a.id}
      name={a.name}
      type={a.type}
      initialBalance={Number(a.initial_balance)}
      balance={balanceById.get(a.id) ?? 0}
      archived={a.is_archived}
    />
  );

  return (
    <div className="space-y-6">
      {active.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Nenhuma conta ativa.
        </p>
      ) : (
        <ul className={LIST}>{active.map(renderRow)}</ul>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Contas arquivadas ({archived.length})
          </summary>
          <ul className={`${LIST} mt-3`}>{archived.map(renderRow)}</ul>
        </details>
      )}
    </div>
  );
}