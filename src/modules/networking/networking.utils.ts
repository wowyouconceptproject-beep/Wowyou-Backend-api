export function normalize(values: string[]): string[] {
  return values
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function unique(values: string[]): string[] {
  return [...new Set(normalize(values))];
}

export function overlap(a: string[], b: string[]): number {
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
  a: string[],
  b: string[],
): number {
  const total = Math.max(
    unique(a).length,
    unique(b).length,
  );

  if (total === 0) {
    return 0;
  }

  return overlap(a, b) / total;
}

export function clamp(
  value: number,
  min = 0,
  max = 100,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}