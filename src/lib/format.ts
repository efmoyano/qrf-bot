export function parsePower(input: string): bigint {
  const match = input.replace(',', '.').match(/\d+(?:\.\d+)?/);

  if (!match) {
    throw new Error(`Invalid power value: ${input}`);
  }

  const millions = Number(match[0]);

  if (!Number.isFinite(millions) || millions < 0) {
    throw new Error(`Invalid power value: ${input}`);
  }

  return BigInt(Math.round(millions * 1_000_000));
}

export function formatPower(power: bigint): string {
  const n = Number(power);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\\.00$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\\.00$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\\.0$/, "")}K`;
  return n.toString();
}
