import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: "neutral" | "income" | "expense";
  footer?: ReactNode;
};

const BUBBLE = {
  neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  income: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  expense: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
};

const VALUE = {
  neutral: "",
  income: "text-green-700 dark:text-green-400",
  expense: "text-red-600 dark:text-red-400",
};

export function SummaryCard({ title, value, icon: Icon, tone = "neutral", footer }: Props) {
  return (
    <div className="h-full rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${BUBBLE[tone]}`}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-0.5 truncate text-base font-bold tracking-tight tabular-nums sm:text-xl ${VALUE[tone]}`}>
        {value}
      </p>
      {footer}
    </div>
  );
}