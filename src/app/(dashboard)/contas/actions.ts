"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseMoney } from "@/lib/finance/money";

export type ActionState = { error?: string; success?: boolean };

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da conta").max(60, "Nome muito longo"),
  type: z.enum(["checking", "cash", "digital_wallet", "savings", "other"], {
    message: "Tipo de conta inválido",
  }),
});

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const rawBalance = String(formData.get("initial_balance") ?? "").trim();
  const initialBalance = rawBalance === "" ? "0" : parseMoney(rawBalance);
  if (initialBalance === null) {
    return { error: "Saldo inicial inválido. Use o formato 1234,56" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // user_id vem da sessão no servidor, nunca do formulário.
  const { error } = await supabase.from("financial_accounts").insert({
    user_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
    initial_balance: initialBalance,
  });

  if (error) return { error: "Não foi possível criar a conta." };

  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { success: true };
}