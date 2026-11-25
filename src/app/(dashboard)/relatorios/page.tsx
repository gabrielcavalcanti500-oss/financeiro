import { Suspense } from "react";
import { ReportsContent } from "@/components/reports/reports-content";

export default function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; ano?: string; mes?: string }>;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <ReportsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}