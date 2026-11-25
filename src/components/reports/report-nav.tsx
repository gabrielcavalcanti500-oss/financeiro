import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel, shiftMonth } from "@/lib/finance/dates";

export type ReportKind = "mensal" | "anual";

function href(kind: ReportKind, year: number, month: number) {
  return kind === "mensal"
    ? `/relatorios?tipo=mensal&ano=${year}&mes=${month}`
    : `/relatorios?tipo=anual&ano=${year}`;
}

export function ReportNav({
  kind,
  year,
  month,
}: {
  kind: ReportKind;
  year: number;
  month: number;
}) {
  const prev = kind === "mensal" ? shiftMonth(year, month, -1) : { year: year - 1, month };
  const next = kind === "mensal" ? shiftMonth(year, month, 1) : { year: year + 1, month };
  const label = kind === "mensal" ? monthLabel(year, month) : String(year);

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800";
  const tab = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition ${
      active
        ? "bg-green-600 text-white"
        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
    }`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
        <Link href={href("mensal", year, month)} className={tab(kind === "mensal")}>
          Mensal
        </Link>
        <Link href={href("anual", year, month)} className={tab(kind === "anual")}>
          Anual
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link href={href(kind, prev.year, prev.month)} className={arrow} aria-label="Período anterior">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <span className="min-w-36 text-center font-semibold">{label}</span>
        <Link href={href(kind, next.year, next.month)} className={arrow} aria-label="Próximo período">
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}