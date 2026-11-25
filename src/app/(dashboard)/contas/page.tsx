import { Suspense } from "react";
import { AccountList } from "@/components/accounts/account-list";
import { NewAccountForm } from "@/components/accounts/new-account-form";

export default function ContasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Contas</h1>
      <NewAccountForm />
      <Suspense
        fallback={<div className="h-24 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}
      >
        <AccountList />
      </Suspense>
    </div>
  );
}