import { Suspense } from "react";
import { CategoryList } from "@/components/categories/category-list";
import { NewCategoryForm } from "@/components/categories/new-category-form";

export default function CategoriasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Categorias</h1>
      <NewCategoryForm />
      <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}>
        <CategoryList />
      </Suspense>
    </div>
  );
}