import Link from "next/link";
import { CreditCard } from "lucide-react";
import { formatDateBR, shortMonthLabel } from "@/lib/finance/dates";
import { formatBRL } from "@/lib/finance/money";

export type CardOverview = {
    cardId: string;
    name: string;
    creditLimit: number;
    used: number;
    available: number;
    nextInvoice: {
        year: number;
        month: number;
        remaining: number;
        dueISO: string;
        daysLeft: number;
    } | null;
};

const TONE = {
    red: "text-red-600",
    amber: "text-amber-600",
    gray: "text-gray-500",
} as const;

function dueInfo(daysLeft: number): { text: string; tone: keyof typeof TONE } {
    if (daysLeft < 0) {
        const days = -daysLeft;
        return { text: `vencida há ${days} dia${days === 1 ? "" : "s"}`, tone: "red" };
    }
    if (daysLeft === 0) return { text: "vence hoje", tone: "red" };
    if (daysLeft === 1) return { text: "vence amanhã", tone: "amber" };
    if (daysLeft <= 5) return { text: `vence em ${daysLeft} dias`, tone: "amber" };
    return { text: `vence em ${daysLeft} dias`, tone: "gray" };
}

export function CardsOverview({ items }: { items: CardOverview[] }) {
    if (items.length === 0) return null;

    return (
        <section className="mt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cartões</h2>
                <Link href="/cartoes" className="text-sm font-medium text-green-600 hover:underline">
                    Ver todos
                </Link>
            </div>

            <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((c) => {
                    const limitCents = Math.round(c.creditLimit * 100);
                    const usedCents = Math.round(c.used * 100);
                    const percent = limitCents > 0 ? (usedCents / limitCents) * 100 : 0;
                    const barColor = percent > 100 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-green-500";
                    const inv = c.nextInvoice;
                    const due = inv ? dueInfo(inv.daysLeft) : null;

                    const href = inv
                        ? `/cartoes/${c.cardId}?ano=${inv.year}&mes=${inv.month}`
                        : `/cartoes/${c.cardId}`;

                    return (
                        <li key={c.cardId} className="animate-fade-up">
                            <Link
                                href={href}
                                className="block rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition hover:border-green-600/50 dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                                        <CreditCard className="h-5 w-5" />
                                    </span>
                                    <p className="min-w-0 flex-1 truncate font-semibold">{c.name}</p>
                                    {inv && due ? (
                                        <div className="text-right">
                                            <p className="font-bold">{formatBRL(inv.remaining)}</p>
                                            <p className={`text-xs ${TONE[due.tone]}`}>
                                                {due.text} · {formatDateBR(inv.dueISO).slice(0, 5)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500">Sem fatura em aberto</p>
                                    )}
                                </div>

                                {inv && (
                                    <p className="mt-2 text-xs capitalize text-gray-500">
                                        Fatura de {shortMonthLabel(inv.year, inv.month)}/{inv.year}
                                    </p>
                                )}

                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div
                                        className={`h-full rounded-full ${barColor}`}
                                        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                                    />
                                </div>
                                <div className="mt-1.5 flex justify-between text-xs text-gray-500">
                                    <span>Usado {formatBRL(c.used)}</span>
                                    <span>Disponível {formatBRL(c.available)}</span>
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}