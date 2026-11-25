"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

const nameSchema = z
  .string()
  .trim()
  .min(2, "Informe o nome da categoria")
  .max(40, "Nome muito longo");

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

const createSchema = z.object({
  name: nameSchema,
  type: z.enum(["income", "expense"], { message: "Tipo inválido" }),
  color: colorSchema,
});

const updateSchema = z.object({
  id: z.string().uuid("Categoria inválida"),
  name: nameSchema,
  color: colorSchema,
});

function revalidateAll() {
  revalidatePath("/categorias");
  revalidatePath("/lancamentos");
  revalidatePath("/dashboard");
}

const DUPLICATE_MESSAGE = "Já existe uma categoria com esse nome neste tipo.";

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id, // sempre da sessão
    name: parsed.data.name,
    type: parsed.data.type,
    color: parsed.data.color,
  });

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_MESSAGE };
    console.error("createCategory:", error.code, error.message);
    return { error: "Não foi possível criar a categoria." };
  }

  revalidateAll();
  return { success: true };
}

// O tipo (receita/despesa) não é editável: trocar o tipo de uma categoria já
// usada deixaria lançamentos antigos incoerentes com a regra de categoria.
export async function updateCategory(
  id: string,
  name: string,
  color: string
): Promise<ActionState> {
  const parsed = updateSchema.safeParse({ id, name, color });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  // O RLS garante que só categorias do próprio usuário podem ser alteradas.
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, color: parsed.data.color })
    .eq("id", parsed.data.id);

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_MESSAGE };
    console.error("updateCategory:", error.code, error.message);
    return { error: "Não foi possível salvar a categoria." };
  }

  revalidateAll();
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: "Categoria inválida." };
  }

  const supabase = await createClient();
  // No banco, a chave estrangeira usa "on delete set null": os lançamentos
  // dessa categoria ficam como "Sem categoria", sem perder nenhum valor.
  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    console.error("deleteCategory:", error.code, error.message);
    return { error: "Não foi possível excluir a categoria." };
  }

  revalidateAll();
  return { success: true };
}