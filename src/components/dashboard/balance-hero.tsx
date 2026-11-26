import { TrendingDown, TrendingUp } from "lucide-react";
import { formatBRL } from "@/lib/finance/money";

export function BalanceHero({ balance, result }: { balance: number; result: number }) {
  const positive = result >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-green-600 via-green-600 to-emerald-700 p-5 text-white shadow-lg shadow-green-900/10 dark:from-green-700 dark:via-green-800 dark:to-gray-900">
      {/* círculos decorativos, só enfeite */}
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 right-12 h-44 w-44 rounded-full bg-white/5" />

      <p className="relative text-sm font-medium text-green-100">Saldo total</p>
      <p className="relative mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
        {formatBRL(balance)}
      </p>

      <div className="relative mt-4 inline-flex items-center gap-1.5 rounded-full bg-black/15 px-3 py-1.5 text-sm font-medium">
        <Icon className="h-4 w-4" />
        <span className="tabular-nums">
          {positive ? "+" : "−"}
          {formatBRL(Math.abs(result))}
        </span>
        <span className="text-green-100">no mês</span>
      </div>
    </section>
  );
}