import { Suspense } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      {/* Os menus leem o endereço atual (usePathname), que só existe na requisição.
          O Suspense permite que o resto da página seja pré-gerado. */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      <div className="md:pl-60">
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:p-8">{children}</main>
      </div>

      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </div>
  );
}