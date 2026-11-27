"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { createLaunch, type ActionState } from "@/app/(dashboard)/lancamentos/actions";
import { categoryIcon } from "@/lib/finance/category-icons";
import {
    addDaysISO,
    formatDateBR,
    invoiceClosingISO,
    invoiceDueISO,
    invoiceMonthFor,
} from "@/lib/finance/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/finance/labels";
import { formatBRL, parseMoney } from "@/lib/finance/money";

export type LaunchType = "expense" | "income" | "transfer" | "card";

type Account = { id: string; name: string };
type Category = { id: string; name: string; type: "income" | "expense"; color: string };
type CardOption = { id: string; name: string; closing_day: number; due_day: number };

type Props = {
    accounts: Account[];
    categories: Category[];
    cards: CardOption[];
    defaultDate: string;
    initialType: LaunchType;
};

const initialState: ActionState = {};

const TYPES: Record<
    LaunchType,
    { label: string; tab: string; soft: string; amount: string; save: string }
> = {
    expense: {
        label: "Despesa",
        tab: "bg-red-600 text-white",
        soft: "bg-red-50 dark:bg-red-950/30",
        amount: "text-red-600 dark:text-red-400",
        save: "bg-red-600 hover:bg-red-700",
    },
    income: {
        label: "Receita",
        tab: "bg-green-600 text-white",
        soft: "bg-green-50 dark:bg-green-950/30",
        amount: "text-green-700 dark:text-green-400",
        save: "bg-green-600 hover:bg-green-700",
    },
    transfer: {
        label: "Transferência",
        tab: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
        soft: "bg-gray-100 dark:bg-gray-800/60",
        amount: "text-gray-700 dark:text-gray-200",
        save: "bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white",
    },
    card: {
        label: "Cartão",
        tab: "bg-indigo-600 text-white",
        soft: "bg-indigo-50 dark:bg-indigo-950/30",
        amount: "text-indigo-600 dark:text-indigo-400",
        save: "bg-indigo-600 hover:bg-indigo-700",
    },
};

const TAB_ORDER: LaunchType[] = ["expense", "income", "transfer", "card"];
const QUICK_INSTALLMENTS = [1, 2, 3, 6, 10, 12];

const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 dark:border-gray-700 dark:bg-gray-950";

function Chip({
    selected,
    onClick,
    children,
}: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 ${selected
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
        >
            {children}
        </button>
    );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function LaunchFormInner({
    accounts,
    categories,
    cards,
    defaultDate,
    initialType,
    onAgain,
}: Props & { onAgain: () => void }) {
    const router = useRouter();
    const [state, formAction, pending] = useActionState(createLaunch, initialState);
    const intentRef = useRef<"close" | "again">("close");

    const [type, setType] = useState<LaunchType>(initialType);
    const [amountText, setAmountText] = useState("");
    const [date, setDate] = useState(defaultDate);
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? "");
    const [categoryId, setCategoryId] = useState("");
    const [cardId, setCardId] = useState(cards[0]?.id ?? "");
    const [installments, setInstallments] = useState(1);
    const [paid, setPaid] = useState(true);

    useEffect(() => {
        if (!state.success) return;
        if (intentRef.current === "again") {
            onAgain();
            return;
        }
        // Volta para a lista, já no mês do lançamento salvo.
        const [y, m] = date.split("-").map(Number);
        router.push(`/lancamentos?ano=${y}&mes=${m}`);
    }, [state, date, onAgain, router]);

    const style = TYPES[type];
    const isCard = type === "card";
    const isTransfer = type === "transfer";

    const parsed = parseMoney(amountText);
    const cents = parsed ? Math.round(Number(parsed) * 100) : 0;

    const categoryList = categories.filter((c) => c.type === (type === "income" ? "income" : "expense"));
    const selectedCategory = categoryList.find((c) => c.id === categoryId);
    const fallbackDescription = selectedCategory?.name ?? (isCard ? "Compra no cartão" : style.label);

    const canSave =
        cents > 0 &&
        (isCard ? cardId !== "" : accountId !== "") &&
        (!isTransfer || (toAccountId !== "" && toAccountId !== accountId));

    const yesterday = addDaysISO(defaultDate, -1);

    // Prévias (informativas; o banco é quem decide de verdade).
    const selectedCard = cards.find((c) => c.id === cardId);
    let invoiceInfo: string | null = null;
    if (isCard && selectedCard && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const inv = invoiceMonthFor(date, selectedCard.closing_day);
        const closing = invoiceClosingISO(inv.year, inv.month, selectedCard.closing_day);
        const due = invoiceDueISO(inv.year, inv.month, selectedCard.closing_day, selectedCard.due_day);
        invoiceInfo = `Entra na fatura que fecha em ${formatDateBR(closing)} e vence em ${formatDateBR(due)}.`;
    }
    const installmentInfo =
        isCard && installments > 1 && cents > 0
            ? `${installments}x de ${formatBRL(Math.round(cents / installments) / 100)}`
            : null;

    function changeType(next: LaunchType) {
        setType(next);
        setCategoryId(""); // categorias de despesa e de receita são listas diferentes
    }

    function handleAction(formData: FormData) {
        if (!String(formData.get("description") ?? "").trim()) {
            formData.set("description", fallbackDescription);
        }
        formAction(formData);
    }

    const noAccounts = !isCard && accounts.length === 0;
    const noCards = isCard && cards.length === 0;

    return (
        <form action={handleAction} className="mx-auto w-full max-w-xl">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="date" value={date} />
            {!isCard && <input type="hidden" name="account_id" value={accountId} />}
            {isTransfer && <input type="hidden" name="transfer_account_id" value={toAccountId} />}
            {isCard && (
                <>
                    <input type="hidden" name="card_id" value={cardId} />
                    <input type="hidden" name="installments" value={installments} />
                </>
            )}
            {!isTransfer && <input type="hidden" name="category_id" value={categoryId} />}

            {/* Tipo */}
            <div className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
                {TAB_ORDER.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => changeType(value)}
                        className={`rounded-xl px-1 py-2.5 text-xs font-semibold transition sm:text-sm ${type === value ? TYPES[value].tab : "text-gray-600 dark:text-gray-400"
                            }`}
                    >
                        {TYPES[value].label}
                    </button>
                ))}
            </div>

            {/* Valor */}
            <div className={`mt-4 rounded-3xl p-6 text-center ${style.soft}`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {isCard ? "Valor total da compra" : "Valor"}
                </p>
                <div className="mt-2 flex items-baseline justify-center gap-2">
                    <span className="text-xl font-semibold text-gray-400">R$</span>
                    <input
                        name="amount"
                        value={amountText}
                        onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.,]/g, ""))}
                        inputMode="decimal"
                        placeholder="0,00"
                        aria-label="Valor"
                        autoFocus
                        className={`w-52 bg-transparent text-center text-5xl! font-bold tracking-tight outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 ${style.amount}`}
                    />
                </div>
                {installmentInfo && <p className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-300">{installmentInfo}</p>}
            </div>

            <input
                name="description"
                maxLength={100}
                placeholder={`Descrição (opcional, padrão: ${fallbackDescription})`}
                className={`${inputClass} mt-4 py-3`}
            />

            {/* Data */}
            <Section label={isCard ? "Data da compra" : "Data"}>
                <div className="flex flex-wrap items-center gap-2">
                    <Chip selected={date === defaultDate} onClick={() => setDate(defaultDate)}>
                        Hoje
                    </Chip>
                    <Chip selected={date === yesterday} onClick={() => setDate(yesterday)}>
                        Ontem
                    </Chip>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => e.target.value && setDate(e.target.value)}
                        aria-label="Outra data"
                        className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                </div>
            </Section>

            {/* Conta / cartão */}
            {isCard ? (
                <Section label="Cartão">
                    {noCards ? (
                        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            Você ainda não tem cartão cadastrado.{" "}
                            <Link href="/cartoes" className="font-medium underline">
                                Cadastrar um cartão
                            </Link>
                        </p>
                    ) : (
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
                            {cards.map((c) => (
                                <Chip key={c.id} selected={c.id === cardId} onClick={() => setCardId(c.id)}>
                                    {c.name}
                                </Chip>
                            ))}
                        </div>
                    )}
                </Section>
            ) : noAccounts ? (
                <Section label="Conta">
                    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Você ainda não tem conta.{" "}
                        <Link href="/contas" className="font-medium underline">
                            Criar uma conta
                        </Link>
                    </p>
                </Section>
            ) : (
                <>
                    <Section label={isTransfer ? "De" : type === "income" ? "Recebe em" : "Paga com"}>
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
                            {accounts.map((a) => (
                                <Chip key={a.id} selected={a.id === accountId} onClick={() => setAccountId(a.id)}>
                                    {a.name}
                                </Chip>
                            ))}
                        </div>
                    </Section>

                    {isTransfer && (
                        <Section label="Para">
                            {accounts.length < 2 ? (
                                <p className="text-sm text-gray-500">Você precisa de pelo menos duas contas para transferir.</p>
                            ) : (
                                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
                                    {accounts.map((a) => (
                                        <Chip key={a.id} selected={a.id === toAccountId} onClick={() => setToAccountId(a.id)}>
                                            {a.name}
                                        </Chip>
                                    ))}
                                </div>
                            )}
                            {toAccountId === accountId && accounts.length >= 2 && (
                                <p className="mt-2 text-xs text-red-600">A conta de destino deve ser diferente da origem.</p>
                            )}
                        </Section>
                    )}
                </>
            )}

            {/* Parcelas */}
            {isCard && !noCards && (
                <Section label="Parcelas">
                    <div className="flex flex-wrap items-center gap-2">
                        {QUICK_INSTALLMENTS.map((n) => (
                            <Chip key={n} selected={installments === n} onClick={() => setInstallments(n)}>
                                {n}x
                            </Chip>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setInstallments((n) => Math.max(1, n - 1))}
                            aria-label="Menos uma parcela"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-16 text-center font-semibold tabular-nums">{installments}x</span>
                        <button
                            type="button"
                            onClick={() => setInstallments((n) => Math.min(48, n + 1))}
                            aria-label="Mais uma parcela"
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 dark:border-gray-700"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    {invoiceInfo && <p className="mt-3 text-xs text-gray-500">{invoiceInfo}</p>}
                </Section>
            )}

            {/* Categoria */}
            {!isTransfer && (
                <Section label="Categoria">
                    {categoryList.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Nenhuma categoria.{" "}
                            <Link href="/categorias" className="font-medium text-green-600 underline">
                                Criar categorias
                            </Link>
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {categoryList.map((c) => {
                                const Icon = categoryIcon(c.name);
                                const selected = c.id === categoryId;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCategoryId(selected ? "" : c.id)}
                                        aria-pressed={selected}
                                        className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-center text-xs font-medium transition active:scale-95 ${selected
                                                ? "border-green-600 bg-green-50 dark:bg-green-950/40"
                                                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                                            }`}
                                    >
                                        {selected && (
                                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 text-white">
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                            </span>
                                        )}
                                        <span
                                            className="flex h-10 w-10 items-center justify-center rounded-full"
                                            style={{ backgroundColor: `${c.color}26`, color: c.color }}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </span>
                                        <span className="w-full truncate">{c.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </Section>
            )}

            {/* Mais detalhes */}
            <details className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400">
                    Mais detalhes
                </summary>
                <div className="mt-4 space-y-4">
                    {!isCard && (
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Forma de pagamento</label>
                            <select name="payment_method" defaultValue="" className={inputClass}>
                                <option value="">Não informar</option>
                                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
                        <input name="notes" maxLength={500} placeholder="Opcional" className={inputClass} />
                    </div>
                    {!isCard && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                name="paid"
                                checked={paid}
                                onChange={(e) => setPaid(e.target.checked)}
                                className="h-4 w-4 accent-green-600"
                            />
                            Já foi {type === "income" ? "recebido" : isTransfer ? "realizado" : "pago"}
                        </label>
                    )}
                </div>
            </details>

            {/* Barra de salvar (fixa no rodapé no celular) */}
            <div className="sticky bottom-0 -mx-4 mt-6 bg-gray-50/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl dark:bg-gray-950/90 md:static md:mx-0 md:bg-transparent md:px-0 md:backdrop-blur-none">
                {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={!canSave || pending}
                        onClick={() => {
                            intentRef.current = "close";
                        }}
                        className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-50 ${style.save}`}
                    >
                        {pending ? "Salvando..." : isCard ? "Salvar compra" : "Salvar"}
                    </button>
                    <button
                        type="submit"
                        disabled={!canSave || pending}
                        onClick={() => {
                            intentRef.current = "again";
                        }}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                        Salvar e novo
                    </button>
                </div>
            </div>
        </form>
    );
}

export function QuickLaunchForm(props: Props) {
    const [resetCount, setResetCount] = useState(0);
    const [flash, setFlash] = useState(false);

    const handleAgain = useCallback(() => {
        setResetCount((c) => c + 1); // recria o formulário vazio
        setFlash(true);
    }, []);

    useEffect(() => {
        if (!flash) return;
        const timer = setTimeout(() => setFlash(false), 3500);
        return () => clearTimeout(timer);
    }, [flash]);

    return (
        <div>
            {flash && (
                <p className="mx-auto mb-3 max-w-xl rounded-xl bg-green-50 p-3 text-center text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                    Lançamento salvo! Pode lançar o próximo.
                </p>
            )}
            <LaunchFormInner key={resetCount} {...props} onAgain={handleAgain} />
        </div>
    );
}