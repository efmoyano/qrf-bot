export function parsePower(input: string): bigint {
  const match = input.replace(",", ".").match(/\d+(?:\.\d+)?/);

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
  const millions = Number(power) / 1_000_000;
  return `${millions.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}M`;
}
