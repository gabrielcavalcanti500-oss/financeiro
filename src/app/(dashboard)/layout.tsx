import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      <Sidebar />
      <div className="md:pl-60">
        <main className="mx-auto max-w-5xl p-4 pb-24 md:p-8">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}