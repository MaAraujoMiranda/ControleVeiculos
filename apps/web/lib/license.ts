import type { LicenseRecord } from "./types";

type LicenseLike = Pick<LicenseRecord, "status" | "expiresAt">;

export function isLicenseBlocked(license: LicenseLike | null | undefined) {
  if (!license) return false;

  if (license.status === "EXPIRED" || license.status === "SUSPENDED") {
    return true;
  }

  const expiresAt = new Date(license.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
}
