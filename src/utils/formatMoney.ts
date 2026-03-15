export function formatMoney(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("es-DO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
