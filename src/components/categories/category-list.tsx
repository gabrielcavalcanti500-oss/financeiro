import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CategoryRow } from "./category-row";

type Category = { id: string; name: string; type: "income" | "expense"; color: string };

function Section({ title, items }: { title: string; items: Category[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
          Nenhuma categoria.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {items.map((c) => (
            <CategoryRow key={c.id} id={c.id} name={c.name} color={c.color} />
          ))}
        </ul>
      )}
    </section>
  );
}

export async function CategoryList() {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, type, color")
    .order("name");

  if (error) {
    console.error("categorias:", error.code, error.message);
    return <p className="text-sm text-red-600">Não foi possível carregar as categorias.</p>;
  }

  const categories = (data ?? []) as Category[];

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Section title="Despesas" items={categories.filter((c) => c.type === "expense")} />
      <Section title="Receitas" items={categories.filter((c) => c.type === "income")} />
    </div>
  );
}