
export function normalize(values: string[] = []): string[] {
  return values
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function unique(values: string[] = []): string[] {
  return [...new Set(normalize(values))];
}

export function overlap(
  a: string[] = [],
  b: string[] = [],
): number {
  const left = new Set(unique(a));
  const right = new Set(unique(b));

  let count = 0;

  for (const item of left) {
    if (right.has(item)) {
      count++;
    }
  }

  return count;
}

export function overlapPercentage(
  a: string[] = [],
  b: string[] = [],
): number {
  const left = unique(a);
  const right = unique(b);

  const total = Math.max(left.length, right.length);

  if (total === 0) {
    return 0;
  }

  return (overlap(left, right) / total) * 100;
}

export function clamp(
  value: number,
  min = 0,
  max = 100,
): number {
  return Math.min(Math.max(value, min), max);
}
