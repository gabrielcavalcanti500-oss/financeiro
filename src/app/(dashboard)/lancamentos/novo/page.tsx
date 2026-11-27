import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewLaunchContent } from "@/components/transactions/new-launch-content";

export default function NovoLancamentoPage({
    searchParams,
}: {
    searchParams: Promise<{ tipo?: string }>;
}) {
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <Link
                    href="/lancamentos"
                    aria-label="Voltar para lançamentos"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold sm:text-2xl">Novo lançamento</h1>
            </div>

            <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-3xl bg-gray-200 dark:bg-gray-800" />}>
                <NewLaunchContent searchParams={searchParams} />
            </Suspense>
        </div>
    );
}