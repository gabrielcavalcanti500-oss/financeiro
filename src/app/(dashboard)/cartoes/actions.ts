"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, parseMoney } from "@/lib/finance/money";

export type ActionState = { error?: string; success?: boolean };

const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function revalidateAll() {
  for (const path of ["/cartoes", "/dashboard", "/lancamentos", "/contas", "/orcamentos", "/relatorios"]) {
    revalidatePath(path);
  }
  revalidatePath("/cartoes/[id]", "page");
}

/** Traduz os códigos de erro das funções do banco para mensagens claras. */
function friendlyError(message: string, fallback: string): string {
  const exceeds = message.match(/AMOUNT_EXCEEDS_INVOICE:(-?\d+(?:\.\d+)?)/);
  if (exceeds) {
    return `O valor é maior que o restante da fatura (${formatBRL(Number(exceeds[1]))}).`;
  }
  if (message.includes("INVALID_CATEGORY")) return "Categoria incompatível: use uma categoria de despesa.";
  if (message.includes("INVALID_INSTALLMENTS")) return "Número de parcelas inválido.";
  if (message.includes("INVALID_AMOUNT")) return "Valor inválido (muito baixo para o número de parcelas).";
  if (message.includes("CARD_NOT_FOUND")) return "Cartão não encontrado.";
  if (message.includes("ACCOUNT_NOT_FOUND")) return "Conta não encontrada.";
  if (message.includes("INVOICE_EMPTY")) return "Esta fatura não tem compras.";
  if (message.includes("INVOICE_HAS_PAYMENTS")) {
    return "Esta compra está em uma fatura que já tem pagamento. Exclua o pagamento em Lançamentos primeiro.";
  }
  if (message.includes("PURCHASE_NOT_FOUND")) return "Compra não encontrada.";
  return fallback;
}

// ---------- cartões ----------
const cardSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cartão").max(40, "Nome muito longo"),
  closing_day: z.coerce.number().int("Dia inválido").min(1, "Fechamento: use um dia de 1 a 28").max(28, "Fechamento: use um dia de 1 a 28"),
  due_day: z.coerce.number().int("Dia inválido").min(1, "Vencimento: use um dia de 1 a 28").max(28, "Vencimento: use um dia de 1 a 28"),
});

export async function createCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rawLimit = text(formData, "credit_limit") ?? "0";
  const limit = parseMoney(rawLimit);
  if (limit === null || Number(limit) < 0) {
    return { error: "Limite inválido. Use o formato 5000,00" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("credit_cards").insert({
    user_id: user.id, // sempre da sessão
    name: parsed.data.name,
    credit_limit: limit,
    closing_day: parsed.data.closing_day,
    due_day: parsed.data.due_day,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe um cartão com esse nome." };
    console.error("createCard:", error.code, error.message);
    return { error: "Não foi possível criar o cartão." };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteCard(id: string): Promise<ActionState> {
  if (!idSchema.safeParse(id).success) return { error: "Cartão inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("credit_cards").delete().eq("id", id);

  if (error) {
    // 23503 = chave estrangeira: ainda existem compras ou pagamentos nesse cartão.
    if (error.code === "23503") {
      return { error: "Este cartão tem compras ou pagamentos. Exclua-os antes de excluir o cartão." };
    }
    console.error("deleteCard:", error.code, error.message);
    return { error: "Não foi possível excluir o cartão." };
  }

  revalidateAll();
  return { success: true };
}

// ---------- compras ----------
const purchaseSchema = z.object({
  card_id: z.string().uuid("Cartão inválido"),
  description: z.string().min(1, "Informe a descrição").max(100, "Descrição muito longa"),
  date: dateSchema,
  installments: z.coerce.number().int("Parcelas inválidas").min(1, "Mínimo de 1 parcela").max(48, "Máximo de 48 parcelas"),
  category_id: z.string().uuid("Categoria inválida").optional(),
  notes: z.string().max(500, "Observação muito longa").optional(),
});

export async function createCardPurchase(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = purchaseSchema.safeParse({
    card_id: text(formData, "card_id"),
    description: text(formData, "description") ?? "",
    date: text(formData, "date"),
    installments: text(formData, "installments") ?? "1",
    category_id: text(formData, "category_id"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (Number.isNaN(Date.parse(d.date))) return { error: "Data inválida" };

  const total = parseMoney(text(formData, "total") ?? "");
  if (total === null || Number(total) <= 0) {
    return { error: "Valor inválido. Use o formato 120,50" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_card_purchase", {
    p_card_id: d.card_id,
    p_category_id: d.category_id ?? null,
    p_description: d.description,
    p_total: total, // string decimal, nunca float
    p_installments: d.installments,
    p_date: d.date,
    p_notes: d.notes ?? null,
    p_source: "system",
  });

  if (error) {
    console.error("createCardPurchase:", error.code, error.message);
    return { error: friendlyError(error.message, "Não foi possível salvar a compra.") };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteCardPurchase(groupId: string): Promise<ActionState> {
  if (!idSchema.safeParse(groupId).success) return { error: "Compra inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_card_purchase", { p_group_id: groupId });

  if (error) {
    console.error("deleteCardPurchase:", error.code, error.message);
    return { error: friendlyError(error.message, "Não foi possível excluir a compra.") };
  }

  revalidateAll();
  return { success: true };
}

// ---------- pagamento de fatura ----------
const paySchema = z.object({
  card_id: z.string().uuid("Cartão inválido"),
  account_id: z.string().uuid("Selecione a conta"),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  date: dateSchema,
});

export async function payInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paySchema.safeParse({
    card_id: text(formData, "card_id"),
    account_id: text(formData, "account_id"),
    year: text(formData, "year"),
    month: text(formData, "month"),
    date: text(formData, "date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  if (Number.isNaN(Date.parse(d.date))) return { error: "Data inválida" };

  const amount = parseMoney(text(formData, "amount") ?? "");
  if (amount === null || Number(amount) <= 0) {
    return { error: "Valor inválido. Use o formato 350,00" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_card_invoice", {
    p_card_id: d.card_id,
    p_year: d.year,
    p_month: d.month,
    p_account_id: d.account_id,
    p_amount: amount,
    p_date: d.date,
  });

  if (error) {
    console.error("payInvoice:", error.code, error.message);
    return { error: friendlyError(error.message, "Não foi possível registrar o pagamento.") };
  }

  revalidateAll();
  return { success: true };
}

export async function updateCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = text(formData, "id");
  if (!id || !idSchema.safeParse(id).success) return { error: "Cartão inválido." };

  const parsed = cardSchema.safeParse({
    name: formData.get("name"),
    closing_day: formData.get("closing_day"),
    due_day: formData.get("due_day"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const limit = parseMoney(text(formData, "credit_limit") ?? "0");
  if (limit === null || Number(limit) < 0) {
    return { error: "Limite inválido. Use o formato 5000,00" };
  }

  const supabase = await createClient();
  // O RLS garante que só é possível alterar cartões do próprio usuário.
  const { data, error } = await supabase
    .from("credit_cards")
    .update({
      name: parsed.data.name,
      credit_limit: limit,
      closing_day: parsed.data.closing_day,
      due_day: parsed.data.due_day,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "23505") return { error: "Já existe um cartão com esse nome." };
    console.error("updateCard:", error.code, error.message);
    return { error: "Não foi possível salvar o cartão." };
  }
  if (!data || data.length === 0) return { error: "Cartão não encontrado." };

  revalidateAll();
  return { success: true };
}