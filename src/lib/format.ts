export function parsePower(input: string): bigint {
  const normalized = input.trim().toUpperCase().replace(/,/g, "");
  const match = normalized.match(/^([0-9]+(?:\\.[0-9]+)?)\\s*(K|M|B)?$/);
  if (!match) throw new Error("Invalid power. Examples: 82.4M, 1.2B, 950K");

  const value = Number(match[1]);
  const suffix = match[2] ?? "";
  const multiplier = suffix === "K" ? 1_000n : suffix === "M" ? 1_000_000n : suffix === "B" ? 1_000_000_000n : 1n;

  return BigInt(Math.round(value * Number(multiplier)));
}

export function formatPower(power: bigint): string {
  const n = Number(power);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace(/\\.00$/, "")}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\\.00$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\\.0$/, "")}K`;
  return n.toString();
}
