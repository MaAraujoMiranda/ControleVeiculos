ALTER TABLE Client
  ADD COLUMN clientModality VARCHAR(30) NULL;

UPDATE Client
SET
  clientModality = CASE
    WHEN clientType IN ('Mensalista', 'Sala') THEN clientType
    ELSE clientModality
  END,
  clientType = CASE
    WHEN clientType IN ('Mensalista', 'Sala') THEN NULL
    ELSE clientType
  END;
