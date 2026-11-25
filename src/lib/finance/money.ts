const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBRL(value: number): string {
  return brl.format(value);
}

/**
 * Converte texto digitado ("1.234,56", "45", "R$ 10,5") em string decimal
 * segura para o banco ("1234.56"). Retorna null se o formato for inválido.
 * Usamos string (e não number) para não passar por ponto flutuante.
 */
export function parseMoney(input: string): string | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(/^R\$/, "");
  if (!cleaned) return null;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;

  return /^-?\d+(\.\d{1,2})?$/.test(normalized) ? normalized : null;
}

/**
 * Soma valores em centavos (inteiros) para evitar erros de ponto flutuante
 * ao somar números já exibidos na interface.
 */
export function sumMoney(values: number[]): number {
  const cents = values.reduce((acc, v) => acc + Math.round(v * 100), 0);
  return cents / 100;
}

/**
 * Variação percentual entre dois valores, calculada em centavos.
 * Retorna null quando não há base de comparação (anterior = 0).
 */
export function percentChange(current: number, previous: number): number | null {
  const c = Math.round(current * 100);
  const p = Math.round(previous * 100);
  if (p === 0) return null;
  return ((c - p) / Math.abs(p)) * 100;
}