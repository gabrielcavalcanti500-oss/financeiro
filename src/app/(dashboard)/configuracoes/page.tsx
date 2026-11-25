import { Suspense } from "react";
import { SettingsContent } from "@/components/settings/settings-content";

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}