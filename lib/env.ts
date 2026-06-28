export function parseIntegerSetting(
  value: string | undefined,
  fallback: number,
  options: { min?: number; max?: number } = {}
): number {
  if (value == null || value.trim() === "") return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (options.min !== undefined && parsed < options.min) return fallback;
  if (options.max !== undefined && parsed > options.max) return fallback;

  return parsed;
}

export function parseISODateSetting(
  value: string | undefined,
  fallback: string
): string {
  const candidate = value?.trim();
  if (!candidate) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;

  const [year, month, day] = candidate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return fallback;
  }

  return candidate;
}
