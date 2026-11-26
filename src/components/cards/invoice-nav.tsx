import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/finance/dates";

export function InvoiceNav({ cardId, year, month }: { cardId: string; year: number; month: number }) {
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800";

  return (
    <div className="flex items-center gap-3">
      <Link href={`/cartoes/${cardId}?ano=${prev.year}&mes=${prev.month}`} className={arrow} aria-label="Fatura anterior">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <span className="min-w-44 text-center font-semibold">Fatura de {monthLabel(year, month)}</span>
      <Link href={`/cartoes/${cardId}?ano=${next.year}&mes=${next.month}`} className={arrow} aria-label="Próxima fatura">
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}