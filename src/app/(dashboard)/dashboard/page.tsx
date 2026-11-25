import { Suspense } from "react";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

function DashboardSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
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
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}