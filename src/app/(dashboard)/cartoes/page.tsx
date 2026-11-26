import { Suspense } from "react";
import { CardList } from "@/components/cards/card-list";
import { NewCardForm } from "@/components/cards/new-card-form";

export default function CartoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cartões</h1>
      <NewCardForm />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <CardList />
      </Suspense>
    </div>
  );
}