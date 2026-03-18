const COMBINING_MARKS_REGEX = /[\u0300-\u036f]/g;

export function cleanString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function nullableTrim(value?: string | null): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = cleanString(value);
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeForSearch(value: string): string {
  return cleanString(value)
    .normalize('NFD')
    .replace(COMBINING_MARKS_REGEX, '')
    .toLowerCase();
}

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidBrazilianPhone(value: string): boolean {
  const digits = normalizeDigits(value);
  return digits.length >= 10 && digits.length <= 11;
}

export function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function isValidPlate(value: string): boolean {
  const normalized = normalizePlate(value);
  const oldPattern = /^[A-Z]{3}\d{4}$/;
  const mercosulPattern = /^[A-Z]{3}\d[A-Z]\d{2}$/;

  return oldPattern.test(normalized) || mercosulPattern.test(normalized);
}

export function formatPlate(value: string): string {
  const normalized = normalizePlate(value);

  if (/^[A-Z]{3}\d{4}$/.test(normalized)) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }

  return normalized;
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeDigits(value);

  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) {
    return false;
  }

  const calculateVerifier = (base: string, factor: number) => {
    let total = 0;

    for (const character of base) {
      total += Number(character) * factor;
      factor -= 1;
    }

    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateVerifier(digits.slice(0, 9), 10);
  const secondDigit = calculateVerifier(digits.slice(0, 10), 11);

  return digits[9] === String(firstDigit) && digits[10] === String(secondDigit);
}

export function formatCpf(value: string): string {
  const digits = normalizeDigits(value);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function normalizeCardNumber(value?: string | null): string | null {
  const normalized = nullableTrim(value);
  return normalized ? normalized.toUpperCase() : null;
}

export function normalizeTrSl(value?: string | null): string | null {
  const normalized = nullableTrim(value);
  return normalized ? normalized.toUpperCase() : null;
}
