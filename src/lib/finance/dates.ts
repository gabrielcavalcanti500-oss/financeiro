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