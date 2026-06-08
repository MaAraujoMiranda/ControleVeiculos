SET @drop_registration_card_unique = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Registration'
        AND index_name = 'Registration_cardNumber_key'
    ),
    'DROP INDEX `Registration_cardNumber_key` ON `Registration`',
    'SELECT 1'
  )
);
PREPARE stmt_drop_registration_card_unique FROM @drop_registration_card_unique;
EXECUTE stmt_drop_registration_card_unique;
DEALLOCATE PREPARE stmt_drop_registration_card_unique;

SET @create_registration_card_idx = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'Registration'
        AND index_name = 'Registration_cardNumber_idx'
    ),
    'SELECT 1',
    'CREATE INDEX `Registration_cardNumber_idx` ON `Registration`(`cardNumber`)'
  )
);
PREPARE stmt_create_registration_card_idx FROM @create_registration_card_idx;
EXECUTE stmt_create_registration_card_idx;
DEALLOCATE PREPARE stmt_create_registration_card_idx;
