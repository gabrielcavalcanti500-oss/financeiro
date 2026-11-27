const TZ = "America/Sao_Paulo";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Ano e mês atuais no fuso do Brasil (o servidor da Vercel roda em UTC). */
export function currentYearMonth(timeZone = TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
  };
}

/** Data de hoje no fuso do Brasil, no formato YYYY-MM-DD. */
export function todayISO(timeZone = TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function monthLabel(year: number, month: number): string {
  const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Avança ou volta meses (delta pode ser negativo). */
export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Intervalo [start, end) do mês, em strings YYYY-MM-DD (sem passar por fuso). */
export function monthRange(year: number, month: number) {
  const next = shiftMonth(year, month, 1);
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${next.year}-${pad(next.month)}-01`,
  };
}

/** "2026-11-23" -> "23/11/2026" (troca de texto, sem Date, para evitar erro de fuso). */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "nov", "dez"... para o eixo do gráfico. */
export function shortMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "");
}

/**
 * Fatura (identificada pelo mês em que FECHA) que recebe uma compra feita em dateISO.
 * Compra no dia do fechamento ou depois vai para a fatura do mês seguinte.
 */
export function invoiceMonthFor(dateISO: string, closingDay: number) {
  const [y, m, d] = dateISO.split("-").map(Number);
  return d >= closingDay ? shiftMonth(y, m, 1) : { year: y, month: m };
}

export function invoiceClosingISO(year: number, month: number, closingDay: number): string {
  return `${year}-${pad(month)}-${pad(closingDay)}`;
}

/** Vencimento: no mesmo mês do fechamento se o dia de vencer vem depois dele; senão, no mês seguinte. */
export function invoiceDueISO(
  year: number,
  month: number,
  closingDay: number,
  dueDay: number
): string {
  const target = dueDay > closingDay ? { year, month } : shiftMonth(year, month, 1);
  return `${target.year}-${pad(target.month)}-${pad(dueDay)}`;
}

/** Dias entre duas datas YYYY-MM-DD (negativo se toISO já passou). Usa UTC para não sofrer com horário de verão. */
export function daysBetweenISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

/** Soma dias a uma data YYYY-MM-DD (delta pode ser negativo), sem depender de fuso. */
export function addDaysISO(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** "Hoje", "Ontem" ou "Segunda, 24 nov". */
export function dayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Hoje";
  if (iso === addDaysISO(todayIso, -1)) return "Ontem";
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d))
    .toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" })
    .split("-")[0];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d} ${shortMonthLabel(y, m)}`;
}