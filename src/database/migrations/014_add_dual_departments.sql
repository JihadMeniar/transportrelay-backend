-- Migration: Add dual department support (departure + arrival)
-- Rides should be visible to users in either the departure or arrival department

-- Add new columns
ALTER TABLE rides ADD COLUMN IF NOT EXISTS departure_department VARCHAR(10);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS arrival_department VARCHAR(10);

-- Migrate existing data: copy current department to both new columns
UPDATE rides SET
  departure_department = department,
  arrival_department = department
WHERE departure_department IS NULL;

-- Make columns NOT NULL after migration
ALTER TABLE rides ALTER COLUMN departure_department SET NOT NULL;
ALTER TABLE rides ALTER COLUMN arrival_department SET NOT NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_rides_departure_department ON rides(departure_department);
CREATE INDEX IF NOT EXISTS idx_rides_arrival_department ON rides(arrival_department);
