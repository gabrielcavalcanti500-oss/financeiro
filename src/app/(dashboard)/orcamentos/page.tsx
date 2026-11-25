import { Suspense } from "react";
import { BudgetsContent } from "@/components/budgets/budgets-content";

export default function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string; mes?: string }>;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orçamentos</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <BudgetsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}