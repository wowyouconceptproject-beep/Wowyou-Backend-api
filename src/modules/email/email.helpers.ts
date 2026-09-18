export function getRequiredEnv(
  name: string,
): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`,
    );
  }

  return value;
}

export function escapeHtml(
  value: unknown,
): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatMoney(
  amount: number,
  currency: string,
): string {
  try {
    return new Intl.NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency:
          currency.toUpperCase(),
      },
    ).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export function formatDate(
  date: Date | string,
): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(new Date(date));
}

export function formatTime(
  date: Date | string,
): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(new Date(date));
}

export function formatDateTime(
  date: Date | string,
): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}