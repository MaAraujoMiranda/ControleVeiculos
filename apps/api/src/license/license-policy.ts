export type LicenseStatusValue = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';

const DEFAULT_LICENSE_MAINTENANCE_GRACE_DAYS = 10;
const DEFAULT_LICENSE_MAINTENANCE_HOUR = 23;
const DEFAULT_LICENSE_TIME_ZONE = 'America/Sao_Paulo';

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);

  if (!Number.isInteger(value)) {
    return fallback;
  }

  return value;
}

function clampHour(hour: number) {
  if (hour < 0) return 0;
  if (hour > 23) return 23;
  return hour;
}

function getMaintenanceConfig() {
  return {
    graceDays: Math.max(
      0,
      readIntegerEnv(
        'LICENSE_MAINTENANCE_GRACE_DAYS',
        DEFAULT_LICENSE_MAINTENANCE_GRACE_DAYS,
      ),
    ),
    hour: clampHour(
      readIntegerEnv(
        'LICENSE_MAINTENANCE_HOUR',
        DEFAULT_LICENSE_MAINTENANCE_HOUR,
      ),
    ),
    timeZone: process.env.LICENSE_TIME_ZONE || DEFAULT_LICENSE_TIME_ZONE,
  };
}

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const values: Record<string, string> = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  parts: Omit<ZonedParts, 'minute' | 'second'>,
  timeZone: string,
) {
  const guessedUtc = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, 0, 0, 0),
  );
  const firstOffset = getTimeZoneOffsetMs(guessedUtc, timeZone);
  const firstResult = new Date(guessedUtc.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstResult, timeZone);

  if (firstOffset === secondOffset) {
    return firstResult;
  }

  return new Date(guessedUtc.getTime() - secondOffset);
}

export function getLicenseMaintenanceAt(expiresAtInput: Date | string) {
  const config = getMaintenanceConfig();
  const expiresAt = new Date(expiresAtInput);
  const expiresAtLocal = getZonedParts(expiresAt, config.timeZone);

  // Due date is day zero; with the current production license shown as
  // 28/05/2026, the maintenance cutover becomes 08/06/2026 at the configured hour.
  const targetLocalDate = new Date(
    Date.UTC(
      expiresAtLocal.year,
      expiresAtLocal.month - 1,
      expiresAtLocal.day + config.graceDays + 1,
      config.hour,
      0,
      0,
      0,
    ),
  );

  return zonedDateTimeToUtc({
    year: targetLocalDate.getUTCFullYear(),
    month: targetLocalDate.getUTCMonth() + 1,
    day: targetLocalDate.getUTCDate(),
    hour: config.hour,
  }, config.timeZone);
}

export function getEffectiveLicenseStatus(
  status: LicenseStatusValue,
  expiresAtInput: Date | string,
  now = new Date(),
): LicenseStatusValue {
  if (status === 'SUSPENDED') {
    return 'SUSPENDED';
  }

  const expiresAt = new Date(expiresAtInput);

  if (expiresAt.getTime() > now.getTime()) {
    return status;
  }

  const maintenanceAt = getLicenseMaintenanceAt(expiresAt);

  if (maintenanceAt.getTime() <= now.getTime()) {
    return 'SUSPENDED';
  }

  return 'EXPIRED';
}
