import { Wallet } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 text-white">
        <Wallet className="h-5 w-5" />
      </div>
      <span className="text-lg font-bold text-gray-900 dark:text-gray-50">{APP_NAME}</span>
    </div>
  );
}