import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "income" | "expense";
  footer?: ReactNode;
};

const TONES = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  income: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  expense: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function SummaryCard({ title, value, icon: Icon, tone = "neutral", footer }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{title}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {footer}
    </div>
  );
}