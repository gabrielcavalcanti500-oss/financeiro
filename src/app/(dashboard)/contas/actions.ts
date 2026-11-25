"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseMoney } from "@/lib/finance/money";

export type ActionState = { error?: string; success?: boolean };
export type DeleteResult = {
  error?: string;
  success?: boolean;
  needsConfirmation?: boolean;
  count?: number;
};

const accountSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da conta").max(60, "Nome muito longo"),
  type: z.enum(["checking", "cash", "digital_wallet", "savings", "other"], {
    message: "Tipo de conta inválido",
  }),
});

const idSchema = z.string().uuid();

// Contas afetam saldos, gráficos, orçamentos e relatórios.
function revalidateAll() {
  for (const path of ["/contas", "/dashboard", "/lancamentos", "/orcamentos", "/relatorios"]) {
    revalidatePath(path);
  }
}

export async function createAccount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

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

  if (error) {
    console.error("createAccount:", error.code, error.message);
    return { error: "Não foi possível criar a conta." };
  }

  revalidateAll();
  return { success: true };
}

export async function updateAccount(
  id: string,
  name: string,
  type: string,
  rawInitialBalance: string
): Promise<ActionState> {
  if (!idSchema.safeParse(id).success) return { error: "Conta inválida." };

  const parsed = accountSchema.safeParse({ name, type });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const trimmed = rawInitialBalance.trim();
  const initialBalance = trimmed === "" ? "0" : parseMoney(trimmed);
  if (initialBalance === null) {
    return { error: "Saldo inicial inválido. Use o formato 1234,56" };
  }

  const supabase = await createClient();
  // O RLS garante que só é possível alterar contas do próprio usuário.
  const { data, error } = await supabase
    .from("financial_accounts")
    .update({
      name: parsed.data.name,
      type: parsed.data.type,
      initial_balance: initialBalance,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("updateAccount:", error.code, error.message);
    return { error: "Não foi possível salvar a conta." };
  }
  if (!data || data.length === 0) return { error: "Conta não encontrada." };

  revalidateAll();
  return { success: true };
}

export async function setAccountArchived(
  id: string,
  archived: boolean
): Promise<ActionState> {
  if (!idSchema.safeParse(id).success) return { error: "Conta inválida." };

  const supabase = await createClient();

  // Só arquiva com saldo zerado: assim o saldo total não "muda sozinho"
  // e continua batendo com os relatórios.
  if (archived) {
    const { data: row, error: balanceError } = await supabase
      .from("account_balances")
      .select("balance")
      .eq("account_id", id)
      .maybeSingle();

    if (balanceError || !row) {
      return { error: "Não foi possível verificar o saldo da conta." };
    }
    if (Math.round(Number(row.balance) * 100) !== 0) {
      return {
        error:
          "Para arquivar, o saldo da conta precisa estar zerado. Transfira o valor para outra conta antes.",
      };
    }
  }

  const { data, error } = await supabase
    .from("financial_accounts")
    .update({ is_archived: archived })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("setAccountArchived:", error.code, error.message);
    return { error: "Não foi possível atualizar a conta." };
  }
  if (!data || data.length === 0) return { error: "Conta não encontrada." };

  revalidateAll();
  return { success: true };
}

/**
 * Primeira chamada com withTransactions = false: se a conta tiver lançamentos,
 * devolve { needsConfirmation, count } sem apagar nada. A interface então pergunta
 * ao usuário e chama de novo com withTransactions = true.
 */
export async function deleteAccount(
  id: string,
  withTransactions: boolean
): Promise<DeleteResult> {
  if (!idSchema.safeParse(id).success) return { error: "Conta inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_account", {
    p_account_id: id,
    p_with_transactions: withTransactions,
  });

  if (error) {
    const match = error.message.match(/ACCOUNT_HAS_TRANSACTIONS:(\d+)/);
    if (match) return { needsConfirmation: true, count: Number(match[1]) };
    if (error.message.includes("ACCOUNT_NOT_FOUND")) return { error: "Conta não encontrada." };

    console.error("deleteAccount:", error.code, error.message);
    return { error: "Não foi possível excluir a conta." };
  }

  revalidateAll();
  return { success: true };
}