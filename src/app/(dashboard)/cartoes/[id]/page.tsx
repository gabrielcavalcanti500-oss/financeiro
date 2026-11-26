import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CardDetail } from "@/components/cards/card-detail";

// Página privada e dinâmica (depende do login e do cartão): sem pré-geração no build.
export const instant = false;

export default function CartaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/cartoes"
          aria-label="Voltar para cartões"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Cartão</h1>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <CardDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}