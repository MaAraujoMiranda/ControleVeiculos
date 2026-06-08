SET @add_license_grace_days = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'License'
        AND column_name = 'maintenanceGraceDays'
    ),
    'SELECT 1',
    'ALTER TABLE `License` ADD COLUMN `maintenanceGraceDays` INT NOT NULL DEFAULT 10'
  )
);
PREPARE stmt_add_license_grace_days FROM @add_license_grace_days;
EXECUTE stmt_add_license_grace_days;
DEALLOCATE PREPARE stmt_add_license_grace_days;

SET @add_license_hour = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'License'
        AND column_name = 'maintenanceHour'
    ),
    'SELECT 1',
    'ALTER TABLE `License` ADD COLUMN `maintenanceHour` INT NOT NULL DEFAULT 23'
  )
);
PREPARE stmt_add_license_hour FROM @add_license_hour;
EXECUTE stmt_add_license_hour;
DEALLOCATE PREPARE stmt_add_license_hour;

SET @add_license_timezone = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'License'
        AND column_name = 'maintenanceTimeZone'
    ),
    'SELECT 1',
    'ALTER TABLE `License` ADD COLUMN `maintenanceTimeZone` VARCHAR(64) NOT NULL DEFAULT ''America/Sao_Paulo'''
  )
);
PREPARE stmt_add_license_timezone FROM @add_license_timezone;
EXECUTE stmt_add_license_timezone;
DEALLOCATE PREPARE stmt_add_license_timezone;

SET @add_license_manual_suspended_at = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'License'
        AND column_name = 'manuallySuspendedAt'
    ),
    'SELECT 1',
    'ALTER TABLE `License` ADD COLUMN `manuallySuspendedAt` DATETIME(3) NULL'
  )
);
PREPARE stmt_add_license_manual_suspended_at FROM @add_license_manual_suspended_at;
EXECUTE stmt_add_license_manual_suspended_at;
DEALLOCATE PREPARE stmt_add_license_manual_suspended_at;

SET @add_license_manual_reason = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'License'
        AND column_name = 'manualSuspensionReason'
    ),
    'SELECT 1',
    'ALTER TABLE `License` ADD COLUMN `manualSuspensionReason` VARCHAR(255) NULL'
  )
);
PREPARE stmt_add_license_manual_reason FROM @add_license_manual_reason;
EXECUTE stmt_add_license_manual_reason;
DEALLOCATE PREPARE stmt_add_license_manual_reason;
