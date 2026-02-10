-- Migration 015: Add departure_city, arrival_city, notes, stretcher_transport
-- Features: city-based routing, ride notes, stretcher transport for medical rides

ALTER TABLE rides ADD COLUMN IF NOT EXISTS departure_city VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS arrival_city VARCHAR(255);
ALTER TABLE rides ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS stretcher_transport BOOLEAN DEFAULT FALSE;
