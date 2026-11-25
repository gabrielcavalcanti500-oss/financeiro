"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand/brand-mark";

const schema = z.object({
  fullName: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});
type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { full_name: values.fullName } },
    });

    if (error) {
      setError(error.message);
      return;
    }
    // Sem sessão = o projeto exige confirmação de e-mail
    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <BrandMark className="mb-6" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Confirme seu e-mail</h1>
          <p className="mt-2 text-sm text-gray-500">
            Enviamos um link de confirmação. Depois de confirmar, faça login.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-green-600 hover:underline">
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Criar conta</h1>
        <p className="mt-1 text-sm text-gray-500">Comece a organizar suas finanças.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
            <input
              type="text"
              autoComplete="name"
              {...register("fullName")}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950"
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
            <input
              type="email"
              autoComplete="email"
              {...register("email")}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
            <input
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-green-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}