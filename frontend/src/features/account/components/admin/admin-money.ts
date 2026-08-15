export function microusdToUsdInput(amountMicrousd: number): string {
  const value = (amountMicrousd / 1_000_000).toFixed(6);
  return value.replace(/(?:\.0+|(?<fraction>\.\d*?)0+)$/, '$<fraction>') || '0';
}

export function usdInputToMicrousd(value: string): number | null {
  const normalized = value.trim();
  const match = /^(?<whole>0|[1-9]\d*)(?:\.(?<fraction>\d{1,6}))?$/.exec(normalized);
  if (!match?.groups) return null;

  const whole = Number(match.groups.whole);
  const fraction = Number((match.groups.fraction ?? '').padEnd(6, '0'));
  const amount = whole * 1_000_000 + fraction;

  return Number.isSafeInteger(amount) ? amount : null;
}
