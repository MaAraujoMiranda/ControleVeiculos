SET @drop_client_cpf_unique = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Client'
        AND index_name = 'Client_cpfDigits_key'
    ),
    'DROP INDEX `Client_cpfDigits_key` ON `Client`',
    'SELECT 1'
  )
);
PREPARE stmt_drop_client_cpf_unique FROM @drop_client_cpf_unique;
EXECUTE stmt_drop_client_cpf_unique;
DEALLOCATE PREPARE stmt_drop_client_cpf_unique;

SET @drop_vehicle_plate_unique = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Vehicle'
        AND index_name = 'Vehicle_plateNormalized_key'
    ),
    'DROP INDEX `Vehicle_plateNormalized_key` ON `Vehicle`',
    'SELECT 1'
  )
);
PREPARE stmt_drop_vehicle_plate_unique FROM @drop_vehicle_plate_unique;
EXECUTE stmt_drop_vehicle_plate_unique;
DEALLOCATE PREPARE stmt_drop_vehicle_plate_unique;

SET @create_client_cpf_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Client'
        AND index_name = 'Client_cpfDigits_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `Client_cpfDigits_idx` ON `Client`(`cpfDigits`)'
  )
);
PREPARE stmt_create_client_cpf_idx FROM @create_client_cpf_idx;
EXECUTE stmt_create_client_cpf_idx;
DEALLOCATE PREPARE stmt_create_client_cpf_idx;

SET @create_vehicle_plate_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Vehicle'
        AND index_name = 'Vehicle_plateNormalized_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `Vehicle_plateNormalized_idx` ON `Vehicle`(`plateNormalized`)'
  )
);
PREPARE stmt_create_vehicle_plate_idx FROM @create_vehicle_plate_idx;
EXECUTE stmt_create_vehicle_plate_idx;
DEALLOCATE PREPARE stmt_create_vehicle_plate_idx;
