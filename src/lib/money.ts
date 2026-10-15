export function parseCents(value: string): number {
  const text = value.trim();
  if (!/^-?\d{1,11}(?:[.,]\d{1,2})?$/.test(text)) throw new Error('Use um valor como 1234,56, sem separador de milhar.');
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split(/[.,]/);
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents > 1_000_000_000_000) throw new Error('Valor acima do limite permitido.');
  return negative ? -cents : cents;
}
export const formatMoney = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
