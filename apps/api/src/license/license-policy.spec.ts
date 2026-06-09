import {
  getEffectiveLicenseStatus,
  getLicenseMaintenanceAt,
} from './license-policy';

describe('license policy', () => {
  const policy = {
    maintenanceGraceDays: 10,
    maintenanceHour: 23,
    maintenanceTimeZone: 'America/Sao_Paulo',
  };

  it('counts the expiration date as the first overdue day', () => {
    const expiresAt = new Date('2026-05-28T11:32:00.000Z');

    expect(getLicenseMaintenanceAt(expiresAt, policy).toISOString()).toBe(
      '2026-06-07T02:00:00.000Z',
    );
  });

  it('suspends automatically after the configured maintenance cutover', () => {
    const expiresAt = new Date('2026-05-28T11:32:00.000Z');

    expect(
      getEffectiveLicenseStatus(
        'EXPIRED',
        expiresAt,
        new Date('2026-06-07T01:59:59.000Z'),
        policy,
      ),
    ).toBe('EXPIRED');
    expect(
      getEffectiveLicenseStatus(
        'EXPIRED',
        expiresAt,
        new Date('2026-06-07T02:00:00.000Z'),
        policy,
      ),
    ).toBe('SUSPENDED');
  });

  it('extends the automatic cutover when grace days are increased', () => {
    const expiresAt = new Date('2026-05-28T11:32:00.000Z');

    expect(
      getEffectiveLicenseStatus(
        'SUSPENDED',
        expiresAt,
        new Date('2026-06-08T15:00:00.000Z'),
        { ...policy, maintenanceGraceDays: 15 },
      ),
    ).toBe('EXPIRED');
  });
});
