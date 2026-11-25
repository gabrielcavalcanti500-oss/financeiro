"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseMoney } from "@/lib/finance/money";

export type ActionState = { error?: string; success?: boolean };

const periodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

function revalidateAll() {
  revalidatePath("/orcamentos");
  revalidatePath("/dashboard");
}

/**
 * Define o orçamento de uma categoria em um mês.
 * Valor vazio ou zero remove o orçamento daquele mês.
 */
export async function saveBudget(
  categoryId: string,
  year: number,
  month: number,
  rawAmount: string
): Promise<ActionState> {
  const parsed = periodSchema
    .extend({ categoryId: z.string().uuid("Categoria inválida") })
    .safeParse({ categoryId, year, month });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const trimmed = rawAmount.trim();
  const amount = trimmed === "" ? "0" : parseMoney(trimmed);
  if (amount === null || Number(amount) < 0) {
    return { error: "Valor inválido. Use o formato 800,00" };
  }

  // Zero ou vazio = remover o orçamento deste mês.
  if (Number(amount) === 0) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("category_id", categoryId)
      .eq("year", year)
      .eq("month", month);
    if (error) {
      console.error("saveBudget(delete):", error.code, error.message);
      return { error: "Não foi possível remover o orçamento." };
    }
    revalidateAll();
    return { success: true };
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id, // sempre da sessão
      category_id: categoryId,
      year,
      month,
      amount, // string decimal, nunca float
    },
    { onConflict: "user_id,category_id,year,month" }
  );

  if (error) {
    console.error("saveBudget:", error.code, error.message);
    return { error: "Não foi possível salvar o orçamento." };
  }

  revalidateAll();
  return { success: true };
}

export async function copyPreviousMonth(
  year: number,
  month: number
): Promise<ActionState & { copied?: number }> {
  const parsed = periodSchema.safeParse({ year, month });
  if (!parsed.success) return { error: "Período inválido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_budgets_from_previous_month", {
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error("copyPreviousMonth:", error.code, error.message);
    return { error: "Não foi possível copiar os orçamentos." };
  }

  revalidateAll();
  return { success: true, copied: Number(data ?? 0) };
}