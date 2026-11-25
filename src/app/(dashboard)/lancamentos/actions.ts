"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseMoney } from "@/lib/finance/money";

export type ActionState = { error?: string; success?: boolean };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Texto do formulário -> string, ou undefined se vazio. */
function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const schema = z.object({
  type: z.enum(["income", "expense", "transfer"], { message: "Tipo inválido" }),
  description: z.string().min(1, "Informe a descrição").max(100, "Descrição muito longa"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  account_id: z.string().uuid("Selecione a conta"),
  category_id: z.string().uuid("Categoria inválida").optional(),
  transfer_account_id: z.string().uuid("Conta de destino inválida").optional(),
  payment_method: z.enum(["pix", "debit", "cash", "transfer", "boleto", "other"]).optional(),
  notes: z.string().max(500, "Observação muito longa").optional(),
});

type TransactionInput = {
  type: "income" | "expense" | "transfer";
  description: string;
  transaction_date: string;
  account_id: string;
  transfer_account_id: string | null;
  category_id: string | null;
  payment_method: string | null;
  notes: string | null;
  amount: string;
  status: "paid" | "pending";
};

/**
 * Validação única, usada por criar e editar.
 * Devolve { error } ou { input } já normalizado para o banco.
 */
async function validateTransactionForm(
  formData: FormData,
  supabase: Supabase
): Promise<{ error: string } | { input: TransactionInput }> {
  const parsed = schema.safeParse({
    type: text(formData, "type"),
    description: text(formData, "description") ?? "",
    date: text(formData, "date"),
    account_id: text(formData, "account_id"),
    category_id: text(formData, "category_id"),
    transfer_account_id: text(formData, "transfer_account_id"),
    payment_method: text(formData, "payment_method"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (Number.isNaN(Date.parse(d.date))) return { error: "Data inválida" };

  const amount = parseMoney(text(formData, "amount") ?? "");
  if (amount === null || Number(amount) <= 0) {
    return { error: "Valor inválido. Use o formato 45,90" };
  }

  if (d.type === "transfer") {
    if (!d.transfer_account_id) return { error: "Selecione a conta de destino" };
    if (d.transfer_account_id === d.account_id) {
      return { error: "A conta de destino deve ser diferente da origem" };
    }
  }

  // Integridade: a categoria precisa ser do mesmo tipo do lançamento.
  if (d.type !== "transfer" && d.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("type")
      .eq("id", d.category_id)
      .maybeSingle();
    if (!category || category.type !== d.type) {
      return { error: "Categoria incompatível com o tipo do lançamento" };
    }
  }

  return {
    input: {
      type: d.type,
      description: d.description,
      transaction_date: d.date,
      account_id: d.account_id,
      transfer_account_id: d.type === "transfer" ? (d.transfer_account_id ?? null) : null,
      category_id: d.type === "transfer" ? null : (d.category_id ?? null),
      payment_method: d.payment_method ?? null,
      notes: d.notes ?? null,
      amount, // string decimal, nunca float
      status: formData.get("paid") === "on" ? "paid" : "pending",
    },
  };
}

function revalidateAll() {
  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
  revalidatePath("/contas");
}

export async function createTransaction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const result = await validateTransactionForm(formData, supabase);
  if ("error" in result) return { error: result.error };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id, // sempre da sessão, nunca do formulário
    ...result.input,
    source: "system",
  });

  if (error) {
    console.error("createTransaction:", error.code, error.message);
    return { error: "Não foi possível salvar o lançamento." };
  }

  revalidateAll();
  return { success: true };
}

/**
 * Recebe o id como primeiro argumento (a página faz bind do id),
 * então o formulário continua usando a assinatura (estado, formData).
 */
export async function updateTransaction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Lançamento inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const result = await validateTransactionForm(formData, supabase);
  if ("error" in result) return { error: result.error };

  // user_id e source não são alterados na edição. O RLS (USING e WITH CHECK)
  // garante que só é possível editar lançamentos do próprio usuário,
  // apontando apenas para contas e categorias dele.
  const { data, error } = await supabase
    .from("transactions")
    .update(result.input)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("updateTransaction:", error.code, error.message);
    return { error: "Não foi possível salvar as alterações." };
  }
  if (!data || data.length === 0) return { error: "Lançamento não encontrado." };

  revalidateAll();

  // Volta para a lista, já no mês do lançamento editado.
  const [year, month] = result.input.transaction_date.split("-");
  redirect(`/lancamentos?ano=${Number(year)}&mes=${Number(month)}`);
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Lançamento inválido." };
  }

  const supabase = await createClient();
  // O RLS garante que só é possível excluir lançamentos do próprio usuário.
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    console.error("deleteTransaction:", error.code, error.message);
    return { error: "Não foi possível excluir o lançamento." };
  }

  revalidateAll();
  return { success: true };
}