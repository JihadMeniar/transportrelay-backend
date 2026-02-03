-- Create ride_documents table
CREATE TABLE IF NOT EXISTS ride_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  uri VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),

  -- Constraint: max 10MB per file
  CONSTRAINT check_document_size CHECK (size_bytes <= 10485760)
);

-- Create index on ride_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ride_documents_ride_id ON ride_documents(ride_id);

-- Create index on mime_type for filtering
CREATE INDEX IF NOT EXISTS idx_ride_documents_mime_type ON ride_documents(mime_type);

-- Add comments
COMMENT ON TABLE ride_documents IS 'Documents attached to rides (max 5 per ride, 10MB total)';
COMMENT ON COLUMN ride_documents.ride_id IS 'Foreign key to rides table';
COMMENT ON COLUMN ride_documents.name IS 'Original filename';
COMMENT ON COLUMN ride_documents.uri IS 'Public URI for accessing the document';
COMMENT ON COLUMN ride_documents.file_path IS 'Server filesystem path';
COMMENT ON COLUMN ride_documents.mime_type IS 'Document MIME type';
COMMENT ON COLUMN ride_documents.size_bytes IS 'File size in bytes (max 10MB)';
