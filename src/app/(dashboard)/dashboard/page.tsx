import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

function DashboardSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-2 h-36 rounded-3xl bg-gray-200 dark:bg-gray-800 lg:col-span-1" />
        <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 lg:h-36" />
        <div className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800 lg:h-36" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold sm:text-2xl">Início</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}