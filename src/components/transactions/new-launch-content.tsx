import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/finance/dates";
import { QuickLaunchForm, type LaunchType } from "./quick-launch-form";

const TYPES: LaunchType[] = ["expense", "income", "transfer", "card"];

export async function NewLaunchContent({
    searchParams,
}: {
    searchParams: Promise<{ tipo?: string }>;
}) {
    await connection();

    const params = await searchParams;
    const supabase = await createClient();

    const [accountsRes, categoriesRes, cardsRes] = await Promise.all([
        supabase.from("financial_accounts").select("id, name").eq("is_archived", false).order("name"),
        supabase.from("categories").select("id, name, type, color").order("name"),
        supabase.from("card_summary").select("card_id, name, closing_day, due_day").order("name"),
    ]);

    if (accountsRes.error || categoriesRes.error) {
        console.error("novo lancamento:", accountsRes.error ?? categoriesRes.error);
        return (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                Não foi possível carregar os dados.
            </p>
        );
    }
    if (cardsRes.error) console.error("novo lancamento/cartoes:", cardsRes.error.code, cardsRes.error.message);

    const cards = (cardsRes.data ?? []).map((c) => ({
        id: c.card_id as string,
        name: c.name as string,
        closing_day: Number(c.closing_day),
        due_day: Number(c.due_day),
    }));

    const initialType = TYPES.includes(params.tipo as LaunchType) ? (params.tipo as LaunchType) : "expense";

    return (
        <QuickLaunchForm
            accounts={accountsRes.data ?? []}
            categories={(categoriesRes.data ?? []) as {
                id: string;
                name: string;
                type: "income" | "expense";
                color: string;
            }[]}
            cards={cards}
            defaultDate={todayISO()}
            initialType={initialType}
        />
    );
}