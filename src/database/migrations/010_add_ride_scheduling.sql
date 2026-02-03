-- Migration: Add scheduling fields to rides
-- Allows scheduling rides for specific dates and times

-- Add scheduling columns to rides table
ALTER TABLE rides
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS departure_time TIME,
ADD COLUMN IF NOT EXISTS arrival_time TIME;

-- Create index for efficient queries on scheduled rides
CREATE INDEX IF NOT EXISTS idx_rides_scheduled_date ON rides(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_rides_departure_time ON rides(departure_time);

-- Comments
COMMENT ON COLUMN rides.scheduled_date IS 'Date of the scheduled ride';
COMMENT ON COLUMN rides.departure_time IS 'Expected departure time';
COMMENT ON COLUMN rides.arrival_time IS 'Expected arrival time at destination';
