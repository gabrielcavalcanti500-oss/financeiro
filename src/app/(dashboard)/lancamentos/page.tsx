import { Suspense } from "react";
import { TransactionsContent } from "@/components/transactions/transactions-content";

export default function LancamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string; tipo?: string; q?: string }>;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold sm:text-2xl">Lançamentos</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <TransactionsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}