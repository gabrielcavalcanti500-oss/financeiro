"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string; success?: boolean };

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(80, "Nome muito longo"),
});

export async function updateProfile(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = schema.safeParse({ fullName: formData.get("full_name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // O RLS só permite atualizar o próprio perfil; o filtro por id é uma segunda barreira.
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id)
    .select("id");

  if (error) {
    console.error("updateProfile:", error.code, error.message);
    return { error: "Não foi possível salvar o perfil." };
  }
  if (!data || data.length === 0) {
    return { error: "Perfil não encontrado." };
  }

  revalidatePath("/configuracoes");
  return { success: true };
}